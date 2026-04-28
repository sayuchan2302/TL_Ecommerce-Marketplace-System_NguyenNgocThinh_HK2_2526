from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog_sync import CatalogSyncError, CatalogSyncService  # noqa: E402


class CatalogSyncServiceTests(unittest.TestCase):
    def _build_png_bytes(self, *, width: int = 8, height: int = 8) -> bytes:
        image = Image.new("RGB", (width, height), color="green")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        return buffer.getvalue()

    def test_download_image_rejects_large_content_length_header(self) -> None:
        service = CatalogSyncService(clip_service=Mock())
        response = Mock()
        response.headers = {"Content-Length": "9999"}
        response.iter_content.return_value = iter([self._build_png_bytes()])
        response.raise_for_status.return_value = None
        response.close.return_value = None
        service.http.get = Mock(return_value=response)

        with patch("app.catalog_sync.settings.max_catalog_image_download_bytes", 100):
            with self.assertRaises(CatalogSyncError) as context:
                service._download_image("https://example.com/image.png")

        self.assertEqual(context.exception.reason, "download_too_large")
        response.close.assert_called_once()

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


if __name__ == "__main__":
    unittest.main()
