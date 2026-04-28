from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

import numpy as np
import torch
from PIL import Image


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.openclip_service import OpenClipService  # noqa: E402


class OpenClipServiceTests(unittest.TestCase):
    class _FakeModel:
        def __init__(self) -> None:
            self.eval = Mock()
            self.encode_image = Mock(return_value=torch.tensor([[3.0, 4.0]], dtype=torch.float32))
            self.encode_text = Mock(return_value=torch.tensor([[3.0, 4.0], [0.0, 5.0]], dtype=torch.float32))

    def setUp(self) -> None:
        OpenClipService._model = None
        OpenClipService._preprocess = None
        OpenClipService._tokenizer = None
        OpenClipService._device = None
        OpenClipService._text_embedding_cache = {}

    def test_model_is_loaded_once_per_process(self) -> None:
        fake_model = self._FakeModel()

        with patch(
            "app.openclip_service.open_clip.create_model_and_transforms",
            return_value=(fake_model, None, Mock()),
        ) as create_mock:
            OpenClipService()
            OpenClipService()

        create_mock.assert_called_once()
        fake_model.eval.assert_called_once()

    def test_encode_images_returns_empty_for_empty_input(self) -> None:
        service = self._build_service()

        self.assertEqual(service.encode_images([]), [])

    def test_encode_images_uses_inference_mode_and_normalizes_vectors(self) -> None:
        fake_model = self._FakeModel()
        preprocess = Mock(return_value=torch.tensor([1.0, 2.0], dtype=torch.float32))
        entered = {"value": False}

        @contextmanager
        def fake_inference_mode():
            entered["value"] = True
            yield

        with patch(
            "app.openclip_service.open_clip.create_model_and_transforms",
            return_value=(fake_model, None, preprocess),
        ), patch("app.openclip_service.torch.inference_mode", return_value=fake_inference_mode()):
            service = OpenClipService()
            rows = service.encode_images([Image.new("RGB", (4, 4), color="red")])

        self.assertTrue(entered["value"])
        self.assertEqual(len(rows), 1)
        self.assertAlmostEqual(float(np.linalg.norm(rows[0])), 1.0, places=6)

    def test_encode_texts_returns_empty_for_empty_input(self) -> None:
        service = self._build_service()

        self.assertEqual(service.encode_texts([]), [])

    def test_encode_texts_normalizes_and_caches_by_exact_prompt_tuple(self) -> None:
        fake_model = self._FakeModel()
        tokenizer = Mock(return_value=torch.tensor([[1], [2]], dtype=torch.int64))

        with patch(
            "app.openclip_service.open_clip.create_model_and_transforms",
            return_value=(fake_model, None, Mock()),
        ), patch("app.openclip_service.open_clip.get_tokenizer", return_value=tokenizer):
            service = OpenClipService()
            first = service.encode_texts(["white socks", "black shoes"])
            first[0][0] = 999.0
            second = service.encode_texts(["white socks", "black shoes"])

        tokenizer.assert_called_once()
        fake_model.encode_text.assert_called_once()
        self.assertAlmostEqual(float(np.linalg.norm(second[0])), 1.0, places=6)
        self.assertNotEqual(float(second[0][0]), 999.0)

    def _build_service(self) -> OpenClipService:
        fake_model = self._FakeModel()
        with patch(
            "app.openclip_service.open_clip.create_model_and_transforms",
            return_value=(fake_model, None, Mock()),
        ):
            return OpenClipService()


if __name__ == "__main__":
    unittest.main()
