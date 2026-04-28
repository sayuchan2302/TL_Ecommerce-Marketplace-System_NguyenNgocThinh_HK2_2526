from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.image_validation import SearchValidationError, decode_search_image, validate_image_upload  # noqa: E402


class ImageValidationTests(unittest.TestCase):
    @staticmethod
    def _build_jpeg_payload(*, size: tuple[int, int] = (6, 6), color: str = "red") -> bytes:
        image = Image.new("RGB", size, color=color)
        buffer = BytesIO()
        image.save(buffer, format="JPEG")
        return buffer.getvalue()

    def test_validate_image_upload_rejects_non_image_content_type(self) -> None:
        with self.assertRaises(SearchValidationError) as context:
            validate_image_upload("application/pdf", b"fake")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.metrics_status, "invalid_content_type")

    def test_validate_image_upload_rejects_empty_payload(self) -> None:
        with self.assertRaises(SearchValidationError) as context:
            validate_image_upload("image/png", b"")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.metrics_status, "empty_payload")

    def test_validate_image_upload_rejects_oversized_payload(self) -> None:
        with patch("app.image_validation.settings.max_upload_size_bytes", 4):
            with self.assertRaises(SearchValidationError) as context:
                validate_image_upload("image/png", b"12345")

        self.assertEqual(context.exception.status_code, 413)
        self.assertEqual(context.exception.metrics_status, "oversized_payload")

    def test_validate_image_upload_accepts_image_or_generic_content_types(self) -> None:
        payload = self._build_jpeg_payload()

        validate_image_upload("image/jpeg", payload)
        validate_image_upload("application/octet-stream", payload)
        validate_image_upload(None, payload)
        validate_image_upload("   ", payload)

    def test_decode_search_image_rejects_corrupt_bytes(self) -> None:
        with self.assertRaises(SearchValidationError) as context:
            decode_search_image(b"not-an-image")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.metrics_status, "decode_error")

    def test_decode_search_image_rejects_oversized_dimensions(self) -> None:
        payload = self._build_jpeg_payload(size=(5, 5))

        with patch("app.image_validation.settings.max_image_pixels", 20):
            with self.assertRaises(SearchValidationError) as context:
                decode_search_image(payload)

        self.assertEqual(context.exception.status_code, 413)
        self.assertEqual(context.exception.metrics_status, "oversized_payload")

    def test_decode_search_image_preserves_exif_orientation_and_rgb_mode(self) -> None:
        image = Image.new("RGB", (12, 24), color="blue")
        exif = Image.Exif()
        exif[274] = 6
        buffer = BytesIO()
        image.save(buffer, format="JPEG", exif=exif)

        decoded = decode_search_image(buffer.getvalue())

        self.assertEqual(decoded.size, (24, 12))
        self.assertEqual(decoded.mode, "RGB")

    def test_octet_stream_text_payload_passes_validation_but_fails_decode(self) -> None:
        validate_image_upload("application/octet-stream", b"hello world")

        with self.assertRaises(SearchValidationError) as context:
            decode_search_image(b"hello world")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.metrics_status, "decode_error")


if __name__ == "__main__":
    unittest.main()
