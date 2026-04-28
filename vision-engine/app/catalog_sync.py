from __future__ import annotations

from collections import defaultdict
from collections.abc import Iterator
from datetime import UTC, datetime
from io import BytesIO
from uuid import NAMESPACE_URL, UUID, uuid5

import requests
from PIL import Image, ImageOps

from .config import settings
from .db import get_connection
from .models import SyncCatalogResponse, VisionCatalogItem, VisionCatalogPage
from .openclip_service import OpenClipService


CATALOG_ENDPOINT = "/api/internal/vision/catalog"
DEACTIVATED_PRODUCTS_ENDPOINT = "/api/internal/vision/catalog/deactivated-products"


class CatalogSyncService:
    def __init__(self, clip_service: OpenClipService) -> None:
        self.clip_service = clip_service
        self.http = requests.Session()

    def close(self) -> None:
        self.http.close()

    def run_full_sync(self) -> SyncCatalogResponse:
        sync_token = datetime.now(UTC).isoformat()
        images_processed = 0
        embeddings_inserted = 0
        embeddings_updated = 0
        skipped_unchanged = 0
        failed_images = 0
        inactive_stale_rows = 0
        failures: list[dict[str, str]] = []
        changed_images_by_product: dict[str, set[str]] = defaultdict(set)

        updated_since = self._resolve_updated_since_cursor()
        incremental_mode = updated_since is not None

        page = 0
        total_pages = 1
        while page < total_pages:
            payload = self._fetch_catalog_page(page=page, updated_since=updated_since)
            total_pages = max(1, payload.total_pages)

            for item in payload.items:
                changed_images_by_product[str(item.backend_product_id)].add(item.image_url)

            for batch in self._iter_batches(payload.items, settings.sync_batch_size):
                if not batch:
                    continue

                images_processed += len(batch)
                existing_rows = self._load_existing_rows(batch)
                reusable_items: list[VisionCatalogItem] = []
                images: list[Image.Image] = []
                batch_items: list[VisionCatalogItem] = []

                for item in batch:
                    if self._can_reuse_embedding(item, existing_rows.get(self._catalog_key(item))):
                        reusable_items.append(item)
                        continue

                    try:
                        image = self._download_image(item.image_url)
                        images.append(image)
                        batch_items.append(item)
                    except Exception as exc:  # noqa: BLE001
                        failed_images += 1
                        failures.append(
                            {
                                "image_url": item.image_url,
                                "backend_product_id": str(item.backend_product_id),
                                "error": str(exc),
                            }
                        )

                if reusable_items:
                    skipped_unchanged += self._refresh_reusable_rows(reusable_items, sync_token)

                if batch_items:
                    vectors = self.clip_service.encode_images(images)
                    inserted, updated = self._upsert_batch(batch_items, vectors, sync_token, existing_rows)
                    embeddings_inserted += inserted
                    embeddings_updated += updated

            page += 1

        if incremental_mode:
            inactive_stale_rows += self._deactivate_missing_images_for_changed_products(changed_images_by_product)
            deactivated_product_ids = self._fetch_deactivated_product_ids(updated_since)
            inactive_stale_rows += self._deactivate_products(deactivated_product_ids)
        else:
            inactive_stale_rows += self._deactivate_stale_rows(sync_token)

        index_version = self._resolve_index_version()
        synced_rows = embeddings_inserted + embeddings_updated
        return SyncCatalogResponse(
            synced_rows=synced_rows,
            failed_rows=failed_images,
            deactivated_rows=inactive_stale_rows,
            images_processed=images_processed,
            embeddings_inserted=embeddings_inserted,
            embeddings_updated=embeddings_updated,
            skipped_unchanged=skipped_unchanged,
            failed_images=failed_images,
            inactive_stale_rows=inactive_stale_rows,
            sync_token=sync_token,
            index_version=index_version,
            failures=failures[:100],
        )

    def _fetch_catalog_page(self, page: int, updated_since: datetime | None) -> VisionCatalogPage:
        params: dict[str, str | int] = {"page": page, "size": settings.sync_page_size}
        if updated_since is not None:
            params["updatedSince"] = self._format_updated_since(updated_since)

        response = self.http.get(
            settings.marketplace_base_url.rstrip("/") + CATALOG_ENDPOINT,
            params=params,
            headers={"X-Vision-Internal-Secret": settings.vision_internal_secret},
            timeout=(settings.connect_timeout_seconds, settings.read_timeout_seconds),
        )
        response.raise_for_status()
        return VisionCatalogPage.model_validate(response.json())

    def _fetch_deactivated_product_ids(self, updated_since: datetime | None) -> list[str]:
        if updated_since is None:
            return []

        response = self.http.get(
            settings.marketplace_base_url.rstrip("/") + DEACTIVATED_PRODUCTS_ENDPOINT,
            params={"updatedSince": self._format_updated_since(updated_since)},
            headers={"X-Vision-Internal-Secret": settings.vision_internal_secret},
            timeout=(settings.connect_timeout_seconds, settings.read_timeout_seconds),
        )
        response.raise_for_status()
        payload = response.json()
        if not isinstance(payload, list):
            return []
        return [str(product_id).strip() for product_id in payload if str(product_id).strip()]

    def _download_image(self, image_url: str) -> Image.Image:
        response = self.http.get(
            image_url,
            timeout=(settings.connect_timeout_seconds, settings.image_download_timeout_seconds),
        )
        response.raise_for_status()
        return self._decode_downloaded_image(response.content)

    def _decode_downloaded_image(self, payload: bytes) -> Image.Image:
        with Image.open(BytesIO(payload)) as probe:
            probe.verify()

        with Image.open(BytesIO(payload)) as source:
            normalized = ImageOps.exif_transpose(source)
            normalized.load()
            return normalized.convert("RGB")

    def _catalog_key(self, item: VisionCatalogItem) -> tuple[str, str]:
        return str(item.backend_product_id), item.image_url

    def _load_existing_rows(self, items: list[VisionCatalogItem]) -> dict[tuple[str, str], dict[str, object]]:
        if not items:
            return {}

        placeholders = ",".join(["(%s, %s)"] * len(items))
        params: list[object] = []
        for item in items:
            params.extend([item.backend_product_id, item.image_url])

        sql = f"""
            SELECT
                backend_product_id,
                image_url,
                source_updated_at,
                model_name,
                model_pretrained
            FROM vision.product_image_embeddings
            WHERE (backend_product_id, image_url) IN ({placeholders})
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                rows = cur.fetchall()

        existing: dict[tuple[str, str], dict[str, object]] = {}
        for row in rows:
            key = str(row[0]), str(row[1])
            existing[key] = {
                "source_updated_at": row[2],
                "model_name": row[3],
                "model_pretrained": row[4],
            }
        return existing

    def _can_reuse_embedding(self, item: VisionCatalogItem, existing: dict[str, object] | None) -> bool:
        if existing is None:
            return False
        if existing.get("model_name") != settings.openclip_model_name:
            return False
        if existing.get("model_pretrained") != settings.openclip_pretrained:
            return False
        return existing.get("source_updated_at") == item.source_updated_at

    def _refresh_reusable_rows(self, items: list[VisionCatalogItem], sync_token: str) -> int:
        if not items:
            return 0

        sql = """
            UPDATE vision.product_image_embeddings
            SET
                product_slug = %s,
                store_id = %s,
                store_slug = %s,
                category_slug = %s,
                image_index = %s,
                is_primary = %s,
                available_stock = %s,
                source_updated_at = %s,
                is_active = true,
                model_name = %s,
                model_pretrained = %s,
                sync_token = %s,
                updated_at = now()
            WHERE backend_product_id = %s
              AND image_url = %s
        """
        rows = [
            (
                item.product_slug,
                item.store_id,
                item.store_slug,
                item.category_slug,
                item.image_index,
                item.is_primary,
                item.available_stock,
                item.source_updated_at,
                settings.openclip_model_name,
                settings.openclip_pretrained,
                sync_token,
                item.backend_product_id,
                item.image_url,
            )
            for item in items
        ]

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.executemany(sql, rows)
            conn.commit()
        return len(rows)

    def _upsert_batch(
        self,
        items: list[VisionCatalogItem],
        vectors: list,
        sync_token: str,
        existing_rows: dict[tuple[str, str], dict[str, object]],
    ) -> tuple[int, int]:
        rows = []
        inserted = 0
        updated = 0
        for item, vector in zip(items, vectors, strict=True):
            row_id = uuid5(NAMESPACE_URL, f"{item.backend_product_id}:{item.image_url}")
            rows.append(
                (
                    row_id,
                    item.backend_product_id,
                    item.product_slug,
                    item.store_id,
                    item.store_slug,
                    item.category_slug,
                    item.image_url,
                    item.image_index,
                    item.is_primary,
                    item.available_stock,
                    item.source_updated_at,
                    vector,
                    True,
                    settings.openclip_model_name,
                    settings.openclip_pretrained,
                    sync_token,
                )
            )
            if self._catalog_key(item) in existing_rows:
                updated += 1
            else:
                inserted += 1

        if not rows:
            return 0, 0

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
                available_stock,
                source_updated_at,
                embedding,
                is_active,
                model_name,
                model_pretrained,
                sync_token
            )
            VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (backend_product_id, image_url)
            DO UPDATE SET
                product_slug = EXCLUDED.product_slug,
                store_id = EXCLUDED.store_id,
                store_slug = EXCLUDED.store_slug,
                category_slug = EXCLUDED.category_slug,
                image_index = EXCLUDED.image_index,
                is_primary = EXCLUDED.is_primary,
                available_stock = EXCLUDED.available_stock,
                source_updated_at = EXCLUDED.source_updated_at,
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
        return inserted, updated

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

    def _deactivate_missing_images_for_changed_products(self, product_images: dict[str, set[str]]) -> int:
        if not product_images:
            return 0

        updated = 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                for product_id, image_urls in product_images.items():
                    cleaned_urls = sorted(url for url in image_urls if url)
                    if cleaned_urls:
                        placeholders = ",".join(["%s"] * len(cleaned_urls))
                        sql = f"""
                            UPDATE vision.product_image_embeddings
                            SET is_active = false, updated_at = now()
                            WHERE backend_product_id = %s
                              AND is_active = true
                              AND image_url NOT IN ({placeholders})
                        """
                        cur.execute(sql, [product_id, *cleaned_urls])
                    else:
                        cur.execute(
                            """
                            UPDATE vision.product_image_embeddings
                            SET is_active = false, updated_at = now()
                            WHERE backend_product_id = %s
                              AND is_active = true
                            """,
                            (product_id,),
                        )
                    updated += max(0, cur.rowcount)
            conn.commit()
        return updated

    def _deactivate_products(self, product_ids: list[str]) -> int:
        uuids: list[UUID] = []
        for value in product_ids:
            try:
                uuids.append(UUID(value))
            except ValueError:
                continue

        if not uuids:
            return 0

        updated = 0
        with get_connection() as conn:
            with conn.cursor() as cur:
                for chunk in self._iter_batches(uuids, 200):
                    placeholders = ",".join(["%s"] * len(chunk))
                    sql = f"""
                        UPDATE vision.product_image_embeddings
                        SET is_active = false, updated_at = now()
                        WHERE backend_product_id IN ({placeholders})
                          AND is_active = true
                    """
                    cur.execute(sql, list(chunk))
                    updated += max(0, cur.rowcount)
            conn.commit()
        return updated

    def _resolve_updated_since_cursor(self) -> datetime | None:
        sql = """
            SELECT MAX(source_updated_at)
            FROM vision.product_image_embeddings
            WHERE is_active = true
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()

        if not row:
            return None
        value = row[0]
        return value if isinstance(value, datetime) else None

    def _format_updated_since(self, value: datetime) -> str:
        normalized = value
        if normalized.tzinfo is not None:
            normalized = normalized.astimezone(UTC).replace(tzinfo=None)
        return normalized.isoformat(timespec="microseconds")

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

    def _iter_batches(self, items: list, size: int) -> Iterator[list]:
        step = max(1, size)
        for index in range(0, len(items), step):
            yield items[index:index + step]
