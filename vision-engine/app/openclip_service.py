from __future__ import annotations

from threading import Lock
from typing import Any, Iterable

import numpy as np
import open_clip
import torch
from PIL import Image

from .config import settings


class OpenClipService:
    _load_lock = Lock()
    _model: Any | None = None
    _preprocess: Any | None = None
    _tokenizer: Any | None = None
    _device: str | None = None
    _text_embedding_cache: dict[tuple[str, ...], list[np.ndarray]] = {}

    def __init__(self) -> None:
        self._ensure_model_loaded()
        model = self.__class__._model
        preprocess = self.__class__._preprocess
        device = self.__class__._device
        if model is None or preprocess is None or device is None:
            raise RuntimeError("OpenCLIP model failed to initialize")
        self.device = device
        self.model = model
        self.preprocess = preprocess

    def encode_image(self, image: Image.Image) -> np.ndarray:
        rows = self.encode_images([image])
        return rows[0]

    def encode_images(self, images: Iterable[Image.Image]) -> list[np.ndarray]:
        tensors = [self.preprocess(image.convert("RGB")) for image in images]
        if not tensors:
            return []

        with torch.inference_mode():
            batch = torch.stack(tensors).to(self.device)
            features = self.model.encode_image(batch)
            features = features / features.norm(dim=-1, keepdim=True)
            rows = features.detach().cpu().numpy().astype(np.float32)
        return [row for row in rows]

    def encode_texts(self, prompts: list[str]) -> list[np.ndarray]:
        if not prompts:
            return []

        cache_key = tuple(prompts)
        cached = self.__class__._text_embedding_cache.get(cache_key)
        if cached is not None:
            return [row.copy() for row in cached]

        tokenizer = self._ensure_tokenizer_loaded()
        with torch.inference_mode():
            tokens = tokenizer(list(cache_key)).to(self.device)
            features = self.model.encode_text(tokens)
            features = features / features.norm(dim=-1, keepdim=True).clamp_min(1e-12)
            rows = features.detach().cpu().numpy().astype(np.float32)

        cached_rows = [row.copy() for row in rows]
        self.__class__._text_embedding_cache[cache_key] = cached_rows
        return [row.copy() for row in cached_rows]

    @classmethod
    def _ensure_model_loaded(cls) -> None:
        if cls._model is not None and cls._preprocess is not None and cls._device is not None:
            return

        with cls._load_lock:
            if cls._model is not None and cls._preprocess is not None and cls._device is not None:
                return

            device = "cuda" if torch.cuda.is_available() else "cpu"
            model, _, preprocess = open_clip.create_model_and_transforms(
                settings.openclip_model_name,
                pretrained=settings.openclip_pretrained,
                device=device,
            )
            model.eval()
            cls._device = device
            cls._model = model
            cls._preprocess = preprocess

    @classmethod
    def _ensure_tokenizer_loaded(cls) -> Any:
        if cls._tokenizer is not None:
            return cls._tokenizer

        with cls._load_lock:
            if cls._tokenizer is None:
                cls._tokenizer = open_clip.get_tokenizer(settings.openclip_model_name)
            return cls._tokenizer
