from __future__ import annotations

from io import BytesIO
from pathlib import Path
import sys
import unittest
from uuid import uuid4

from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.search_service import (  # noqa: E402
    SearchValidationError,
    apply_candidate_thresholds,
    decode_search_image,
    group_search_candidates,
    validate_image_upload,
)


class SearchServiceLogicTests(unittest.TestCase):
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

    def test_decode_search_image_rejects_invalid_bytes(self) -> None:
        with self.assertRaises(SearchValidationError) as context:
            decode_search_image(b"not-an-image")

        self.assertEqual(context.exception.status_code, 400)
        self.assertEqual(context.exception.metrics_status, "decode_error")

    def test_group_search_candidates_prefers_higher_score(self) -> None:
        product_id = uuid4()
        rows = [
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/a.jpg",
                "image_index": 2,
                "is_primary": False,
                "score": 0.82,
            },
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/b.jpg",
                "image_index": 1,
                "is_primary": True,
                "score": 0.91,
            },
        ]

        grouped = group_search_candidates(rows)

        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0].matched_image_url, "https://example.com/b.jpg")
        self.assertTrue(grouped[0].is_primary)

    def test_group_search_candidates_prefers_primary_then_lower_index_on_tie(self) -> None:
        product_id = uuid4()
        rows = [
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/a.jpg",
                "image_index": 3,
                "is_primary": False,
                "score": 0.88,
            },
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/b.jpg",
                "image_index": 4,
                "is_primary": True,
                "score": 0.88,
            },
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/c.jpg",
                "image_index": 1,
                "is_primary": True,
                "score": 0.88,
            },
        ]

        grouped = group_search_candidates(rows)

        self.assertEqual(len(grouped), 1)
        self.assertEqual(grouped[0].matched_image_url, "https://example.com/c.jpg")
        self.assertEqual(grouped[0].matched_image_index, 1)

    def test_apply_candidate_thresholds_returns_low_confidence_when_top_score_is_too_low(self) -> None:
        product_id = uuid4()
        grouped = group_search_candidates([
            {
                "backend_product_id": product_id,
                "image_url": "https://example.com/a.jpg",
                "image_index": 0,
                "is_primary": True,
                "score": 0.5,
            }
        ])

        candidates, top_score, score_floor, status = apply_candidate_thresholds(grouped)

        self.assertEqual(candidates, [])
        self.assertEqual(status, "low_confidence")
        self.assertEqual(top_score, 0.5)
        self.assertIsNotNone(score_floor)

    def test_apply_candidate_thresholds_filters_tail_candidates(self) -> None:
        grouped = group_search_candidates([
            {
                "backend_product_id": uuid4(),
                "image_url": "https://example.com/a.jpg",
                "image_index": 0,
                "is_primary": True,
                "score": 0.9,
            },
            {
                "backend_product_id": uuid4(),
                "image_url": "https://example.com/b.jpg",
                "image_index": 0,
                "is_primary": True,
                "score": 0.7,
            },
            {
                "backend_product_id": uuid4(),
                "image_url": "https://example.com/c.jpg",
                "image_index": 0,
                "is_primary": True,
                "score": 0.5,
            },
        ])

        candidates, top_score, score_floor, status = apply_candidate_thresholds(grouped)

        self.assertEqual(status, "accepted")
        self.assertEqual(top_score, 0.9)
        self.assertAlmostEqual(score_floor or 0.0, 0.63, places=2)
        self.assertEqual(len(candidates), 2)

    def test_decode_search_image_accepts_real_image_bytes(self) -> None:
        image = Image.new("RGB", (4, 4), color="red")
        buffer = BytesIO()
        image.save(buffer, format="PNG")
        payload = buffer.getvalue()

        decoded = decode_search_image(payload)

        self.assertEqual(decoded.size, (4, 4))


if __name__ == "__main__":
    unittest.main()
