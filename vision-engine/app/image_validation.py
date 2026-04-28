from __future__ import annotations

from io import BytesIO

from PIL import Image, ImageOps

from .config import settings


Image.MAX_IMAGE_PIXELS = max(1, settings.max_image_pixels)
GENERIC_BINARY_CONTENT_TYPES = {"", "application/octet-stream"}


class SearchValidationError(Exception):
    def __init__(self, status_code: int, detail: str, metrics_status: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.metrics_status = metrics_status


def validate_image_upload(content_type: str | None, payload: bytes) -> None:
    if not payload:
        raise SearchValidationError(400, "Image file is required", "empty_payload")
    if len(payload) > settings.max_upload_size_bytes:
        raise SearchValidationError(413, "Image file is too large", "oversized_payload")
    normalized_content_type = (content_type or "").strip().lower()
    if normalized_content_type.startswith("image/"):
        return
    if normalized_content_type in GENERIC_BINARY_CONTENT_TYPES:
        return
    raise SearchValidationError(400, "Uploaded file must be an image", "invalid_content_type")


def decode_search_image(payload: bytes) -> Image.Image:
    try:
        with Image.open(BytesIO(payload)) as probe:
            probe.verify()

        with Image.open(BytesIO(payload)) as source:
            normalized = ImageOps.exif_transpose(source)
            if normalized.width * normalized.height > settings.max_image_pixels:
                raise SearchValidationError(413, "Image dimensions are too large", "oversized_payload")
            normalized.load()
            return normalized.convert("RGB")
    except SearchValidationError:
        raise
    except Image.DecompressionBombError as exc:
        raise SearchValidationError(413, "Image dimensions are too large", "oversized_payload") from exc
    except Exception as exc:  # noqa: BLE001
        raise SearchValidationError(400, "Unable to decode image", "decode_error") from exc
