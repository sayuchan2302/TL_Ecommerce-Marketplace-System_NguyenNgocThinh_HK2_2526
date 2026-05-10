from __future__ import annotations

from contextlib import contextmanager
from io import BytesIO
from pathlib import Path
import sys
from datetime import UTC, datetime
import unittest
from unittest.mock import Mock, patch
from uuid import uuid4

from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog_sync import CatalogSyncError, CatalogSyncInProgressError, CatalogSyncService, settings  # noqa: E402
from app.models import VisionCatalogItem, VisionCatalogPage  # noqa: E402


class CatalogSyncServiceTests(unittest.TestCase):
    def _build_png_bytes(self, *, width: int = 8, height: int = 8) -> bytes:
        image = Image.new("RGB", (width, height), color="green")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    def test_download_image_rejects_large_content_length_header(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        response = Mock()
        response.status_code = 200
        response.headers = {"Content-Length": "9999"}
        response.iter_content.return_value = iter([self._build_png_bytes()])
        response.raise_for_status.return_value = None
        response.close.return_value = None
        service.http.get = Mock(return_value=response)

        with patch("app.catalog_sync.settings.max_catalog_image_download_bytes", 100):
            with self.assertRaises(CatalogSyncError) as context:
                service._download_image("https://www.gap.com/webcontent/0000/image.png")

        self.assertEqual(context.exception.reason, "download_too_large")
        response.close.assert_called_once()

    def test_download_image_rejects_redirects(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        response = Mock()
        response.status_code = 302
        response.headers = {"Location": "http://127.0.0.1/admin"}
        response.close.return_value = None
        service.http.get = Mock(return_value=response)

        with self.assertRaises(CatalogSyncError) as context:
            service._download_image("https://www.gap.com/webcontent/0000/image.png")

        self.assertEqual(context.exception.reason, "disallowed_image_redirect")
        response.raise_for_status.assert_not_called()
        response.close.assert_called_once()

    def test_resolve_download_url_accepts_relative_product_upload(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        with patch("app.catalog_sync.settings.marketplace_base_url", "http://localhost:8080"):
            resolved = service._resolve_download_url("/uploads/products/example.png")

        self.assertEqual(resolved, "http://localhost:8080/uploads/products/example.png")

    def test_resolve_download_url_accepts_gap_dataset_image(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        resolved = service._resolve_download_url("https://www.gap.com/webcontent/0056/983/758/cn56983758.jpg")

        self.assertEqual(resolved, "https://www.gap.com/webcontent/0056/983/758/cn56983758.jpg")

    def test_resolve_download_url_rejects_private_host(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        with self.assertRaises(CatalogSyncError) as context:
            service._resolve_download_url("http://127.0.0.1:8080/uploads/products/example.png")

        self.assertEqual(context.exception.reason, "disallowed_image_url")

    def test_resolve_download_url_rejects_file_scheme(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        with self.assertRaises(CatalogSyncError) as context:
            service._resolve_download_url("file:///etc/passwd")

        self.assertEqual(context.exception.reason, "disallowed_image_url")

    def test_resolve_download_url_rejects_unknown_external_host(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        with self.assertRaises(CatalogSyncError) as context:
            service._resolve_download_url("https://example.com/product.png")

        self.assertEqual(context.exception.reason, "disallowed_image_url")

    def test_decode_downloaded_image_rejects_large_decoded_pixels(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        payload = self._build_png_bytes(width=20, height=20)

        with patch("app.catalog_sync.settings.max_image_pixels", 100):
            with self.assertRaises(CatalogSyncError) as context:
                service._decode_downloaded_image(payload)

        self.assertIn(context.exception.reason, {"decoded_pixels_too_large", "decompression_bomb"})

    def test_decode_downloaded_image_rejects_corrupt_payload(self) -> None:
        service = CatalogSyncService(clip_service=Mock())

        with self.assertRaises(CatalogSyncError) as context:
            service._decode_downloaded_image(b"corrupt")

        self.assertEqual(context.exception.reason, "decode_error")

    def test_run_full_sync_falls_back_to_full_backfill_when_index_is_incomplete(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        page = VisionCatalogPage(items=[], totalProducts=877, page=0, size=100, totalPages=1, generatedAt=None)

        with patch.object(service, "_resolve_updated_since_cursor", return_value=datetime(2026, 4, 28, tzinfo=UTC)):
            with patch.object(service, "_count_missing_public_products_from_index", return_value=522):
                with patch.object(service, "_fetch_catalog_page", return_value=page) as fetch_catalog_page:
                    with patch.object(service, "_resolve_index_version", return_value="index-version"):
                        with patch.object(service, "_deactivate_stale_rows", return_value=0):
                            response = service.run_full_sync()

        fetch_catalog_page.assert_called_once_with(page=0, updated_since=None)
        self.assertEqual(response.synced_rows, 0)
        self.assertEqual(response.failed_rows, 0)
        self.assertEqual(response.index_version, "index-version")

    def test_run_full_sync_reuses_embedding_by_image_url_after_backend_reset(self) -> None:
        clip_service = Mock()
        service = CatalogSyncService(clip_service=clip_service)
        item = VisionCatalogItem(
            backend_product_id=uuid4(),
            product_slug="reset-product",
            store_id=uuid4(),
            store_slug="store",
            category_slug="men-ao",
            image_url="https://example.com/product.jpg",
            source_updated_at=datetime(2026, 5, 8, tzinfo=UTC),
        )
        page = VisionCatalogPage(items=[item], totalProducts=1, page=0, size=100, totalPages=1, generatedAt=None)
        existing_rows = {
            service._image_reuse_key(item.image_url): {
                "source_updated_at": datetime(2026, 5, 1, tzinfo=UTC),
                "model_name": settings.openclip_model_name,
                "model_pretrained": settings.openclip_pretrained,
                "embedding": [0.1, 0.2],
            }
        }

        with patch.object(service, "_resolve_updated_since_cursor", return_value=None):
            with patch.object(service, "_fetch_catalog_page", return_value=page):
                with patch.object(service, "_load_existing_rows", return_value=existing_rows):
                    with patch.object(service, "_download_image") as download_image:
                        with patch.object(service, "_upsert_reusable_rows", return_value=1) as upsert_reusable:
                            with patch.object(service, "_deactivate_stale_rows", return_value=0):
                                with patch.object(service, "_resolve_index_version", return_value="index-version"):
                                    response = service.run_full_sync()

        download_image.assert_not_called()
        clip_service.encode_images.assert_not_called()
        upsert_reusable.assert_called_once()
        self.assertEqual(response.skipped_unchanged, 1)
        self.assertEqual(response.embeddings_inserted, 0)
        self.assertEqual(response.embeddings_updated, 0)

    def test_upsert_reusable_rows_writes_new_product_id_with_existing_embedding(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        item = VisionCatalogItem(
            backend_product_id=uuid4(),
            product_slug="reset-product",
            store_id=uuid4(),
            store_slug="store",
            category_slug="men-ao",
            image_url="https://example.com/product.jpg",
            image_index=2,
            is_primary=True,
            available_stock=7,
            source_updated_at=datetime(2026, 5, 8, tzinfo=UTC),
        )
        existing = {
            "source_updated_at": datetime(2026, 5, 1, tzinfo=UTC),
            "model_name": settings.openclip_model_name,
            "model_pretrained": settings.openclip_pretrained,
            "embedding": [0.1, 0.2],
        }
        captured: dict[str, object] = {}

        class FakeCursor:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return None

            def executemany(self, sql, rows):
                captured["sql"] = sql
                captured["rows"] = rows

        class FakeConnection:
            def cursor(self):
                return FakeCursor()

            def commit(self):
                captured["committed"] = True

        @contextmanager
        def fake_get_connection():
            yield FakeConnection()

        with patch("app.catalog_sync.get_connection", fake_get_connection):
            count = service._upsert_reusable_rows([(item, existing)], "sync-token")

        rows = captured["rows"]
        self.assertEqual(count, 1)
        self.assertEqual(len(rows), 1)
        self.assertEqual(len(rows[0]), 16)
        self.assertEqual(rows[0][1], item.backend_product_id)
        self.assertEqual(rows[0][6], item.image_url)
        self.assertEqual(rows[0][11], existing["embedding"])
        self.assertTrue(captured["committed"])

    def test_run_full_sync_rejects_parallel_execution(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        acquired = service._run_lock.acquire(blocking=False)
        self.assertTrue(acquired)
        try:
            with self.assertRaises(CatalogSyncInProgressError):
                service.run_full_sync()
        finally:
            service._run_lock.release()


if __name__ == "__main__":
    unittest.main()
