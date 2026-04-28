from __future__ import annotations

from pathlib import Path
import sys
import unittest

from PIL import Image, ImageDraw


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.query_views import build_query_views, center_crop, extract_foreground_crop  # noqa: E402


class QueryViewTests(unittest.TestCase):
    def test_build_query_views_adds_foreground_original_center_in_order(self) -> None:
        image = Image.new("RGB", (100, 100), color="white")
        drawer = ImageDraw.Draw(image)
        drawer.rectangle([38, 12, 62, 88], fill="black")

        views = build_query_views(image)

        self.assertEqual([view.name for view in views], ["foreground", "original", "center"])

    def test_build_query_views_keeps_original_when_no_crop_is_available(self) -> None:
        image = Image.new("RGB", (10, 10), color="white")

        views = build_query_views(image)

        self.assertEqual([view.name for view in views], ["original"])

    def test_extract_foreground_crop_returns_none_for_uniform_background(self) -> None:
        image = Image.new("RGB", (100, 100), color="white")

        self.assertIsNone(extract_foreground_crop(image))

    def test_center_crop_returns_smaller_rgb_image(self) -> None:
        image = Image.new("RGBA", (100, 80), color=(255, 255, 255, 255))

        cropped = center_crop(image)

        self.assertIsNotNone(cropped)
        assert cropped is not None
        self.assertEqual(cropped.mode, "RGB")
        self.assertLess(cropped.width, image.width)
        self.assertLess(cropped.height, image.height)


if __name__ == "__main__":
    unittest.main()
