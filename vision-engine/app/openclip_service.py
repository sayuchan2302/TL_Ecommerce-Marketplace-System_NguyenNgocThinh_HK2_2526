from __future__ import annotations

from typing import Iterable

import numpy as np
import open_clip
import torch
from PIL import Image

from .config import settings


class OpenClipService:
    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            settings.openclip_model_name,
            pretrained=settings.openclip_pretrained,
            device=self.device,
        )
        self.model.eval()

    def encode_image(self, image: Image.Image) -> np.ndarray:
        rows = self.encode_images([image])
        return rows[0]

    def encode_images(self, images: Iterable[Image.Image]) -> list[np.ndarray]:
        tensors = [self.preprocess(image.convert("RGB")) for image in images]
        if not tensors:
            return []

        with torch.no_grad():
            batch = torch.stack(tensors).to(self.device)
            features = self.model.encode_image(batch)
            features = features / features.norm(dim=-1, keepdim=True)
            rows = features.detach().cpu().numpy().astype(np.float32)
        return [row for row in rows]

