from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime
from io import BytesIO
from uuid import NAMESPACE_URL, uuid5

import requests
from PIL import Image

from .config import settings
from .db import get_connection
from .models import SyncCatalogResponse, VisionCatalogItem, VisionCatalogPage
from .openclip_service import OpenClipService


CATALOG_ENDPOINT = "/api/internal/vision/catalog"


class CatalogSyncService:
    def __init__(self, clip_service: OpenClipService) -> None:
        self.clip_service = clip_service
        self.http = requests.Session()

    def run_full_sync(self) -> SyncCatalogResponse:
        sync_token = datetime.now(UTC).isoformat()
        synced_rows = 0
        failed_rows = 0
        failures: list[dict[str, str]] = []

        page = 0
        total_pages = 1
        while page < total_pages:
            payload = self._fetch_catalog_page(page)
            total_pages = max(1, payload.total_pages)

            for batch in self._iter_batches(payload.items, settings.sync_batch_size):
                images: list[Image.Image] = []
                batch_items: list[VisionCatalogItem] = []

                for item in batch:
                    try:
                        image = self._download_image(item.image_url)
                        images.append(image)
                        batch_items.append(item)
                    except Exception as exc:  # noqa: BLE001
                        failed_rows += 1
                        failures.append({
                            "image_url": item.image_url,
                            "backend_product_id": str(item.backend_product_id),
                            "error": str(exc),
                        })

                if not batch_items:
                    continue

                vectors = self.clip_service.encode_images(images)
                synced_rows += self._upsert_batch(batch_items, vectors, sync_token)

            page += 1

        deactivated_rows = self._deactivate_stale_rows(sync_token)
        index_version = self._resolve_index_version()

        return SyncCatalogResponse(
            synced_rows=synced_rows,
            failed_rows=failed_rows,
            deactivated_rows=deactivated_rows,
            sync_token=sync_token,
            index_version=index_version,
            failures=failures[:100],
        )

    def _fetch_catalog_page(self, page: int) -> VisionCatalogPage:
        response = self.http.get(
            settings.marketplace_base_url.rstrip("/") + CATALOG_ENDPOINT,
            params={"page": page, "size": settings.sync_page_size},
            headers={"X-Vision-Internal-Secret": settings.vision_internal_secret},
            timeout=(settings.connect_timeout_seconds, settings.read_timeout_seconds),
        )
        response.raise_for_status()
        return VisionCatalogPage.model_validate(response.json())

    def _download_image(self, image_url: str) -> Image.Image:
        response = self.http.get(
            image_url,
            timeout=(settings.connect_timeout_seconds, settings.image_download_timeout_seconds),
        )
        response.raise_for_status()
        return Image.open(BytesIO(response.content)).convert("RGB")

    def _upsert_batch(self, items: list[VisionCatalogItem], vectors: list, sync_token: str) -> int:
        rows = []
        for item, vector in zip(items, vectors, strict=True):
            row_id = uuid5(NAMESPACE_URL, f"{item.backend_product_id}:{item.image_url}")
            rows.append((
                row_id,
                item.backend_product_id,
                item.product_slug,
                item.store_id,
                item.store_slug,
                item.category_slug,
                item.image_url,
                item.image_index,
                item.is_primary,
                vector,
                True,
                settings.openclip_model_name,
                settings.openclip_pretrained,
                sync_token,
            ))

        if not rows:
            return 0

        sql = """
            INSERT INTO vision.product_image_embeddings (
                id,
                backend_product_id,
                product_slug,
                store_id,
                store_slug,
                category_slug,
                image_url,
                image_index,
                is_primary,
                embedding,
                is_active,
                model_name,
                model_pretrained,
                sync_token
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (backend_product_id, image_url)
            DO UPDATE SET
                product_slug = EXCLUDED.product_slug,
                store_id = EXCLUDED.store_id,
                store_slug = EXCLUDED.store_slug,
                category_slug = EXCLUDED.category_slug,
                image_index = EXCLUDED.image_index,
                is_primary = EXCLUDED.is_primary,
                embedding = EXCLUDED.embedding,
                is_active = true,
                model_name = EXCLUDED.model_name,
                model_pretrained = EXCLUDED.model_pretrained,
                sync_token = EXCLUDED.sync_token,
                updated_at = now()
        """

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
        return len(rows)

    def _deactivate_stale_rows(self, sync_token: str) -> int:
        sql = """
            UPDATE vision.product_image_embeddings
            SET is_active = false, updated_at = now()
            WHERE sync_token <> %s
              AND is_active = true
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, (sync_token,))
                updated = cur.rowcount
            conn.commit()
        return max(0, updated)

    def _resolve_index_version(self) -> str:
        sql = """
            SELECT sync_token
            FROM vision.product_image_embeddings
            WHERE is_active = true
            ORDER BY updated_at DESC
            LIMIT 1
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()
        return row[0] if row else "empty"

    def _iter_batches(self, items: list[VisionCatalogItem], size: int) -> Iterator[list[VisionCatalogItem]]:
        step = max(1, size)
        for index in range(0, len(items), step):
            yield items[index:index + step]

