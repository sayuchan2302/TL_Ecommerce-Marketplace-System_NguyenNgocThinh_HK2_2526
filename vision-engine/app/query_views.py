from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from PIL import Image


@dataclass(frozen=True, slots=True)
class QueryView:
    name: str
    image: Image.Image


def extract_foreground_crop(image: Image.Image) -> Image.Image | None:
    rgb = image.convert("RGB")
    rows = np.asarray(rgb, dtype=np.int16)
    if rows.ndim != 3 or rows.shape[2] != 3:
        return None

    height, width, _ = rows.shape
    if height < 16 or width < 16:
        return None

    border = np.concatenate(
        (
            rows[0, :, :],
            rows[-1, :, :],
            rows[:, 0, :],
            rows[:, -1, :],
        ),
        axis=0,
    )
    bg_color = np.median(border, axis=0)
    diff = np.max(np.abs(rows - bg_color), axis=2)
    mask = diff >= 18
    if not np.any(mask):
        return None

    ys, xs = np.where(mask)
    y_min, y_max = int(ys.min()), int(ys.max())
    x_min, x_max = int(xs.min()), int(xs.max())
    box_width = x_max - x_min + 1
    box_height = y_max - y_min + 1
    area_ratio = (box_width * box_height) / float(max(1, width * height))
    if area_ratio < 0.03 or area_ratio > 0.98:
        return None

    padding = max(2, int(min(width, height) * 0.05))
    x0 = max(0, x_min - padding)
    y0 = max(0, y_min - padding)
    x1 = min(width, x_max + padding + 1)
    y1 = min(height, y_max + padding + 1)
    if x1 - x0 < 8 or y1 - y0 < 8:
        return None

    return rgb.crop((x0, y0, x1, y1))


def center_crop(image: Image.Image, ratio: float = 0.82) -> Image.Image | None:
    rgb = image.convert("RGB")
    width, height = rgb.size
    if width < 16 or height < 16:
        return None

    crop_width = max(8, int(width * ratio))
    crop_height = max(8, int(height * ratio))
    if crop_width >= width and crop_height >= height:
        return None

    left = max(0, (width - crop_width) // 2)
    top = max(0, (height - crop_height) // 2)
    right = min(width, left + crop_width)
    bottom = min(height, top + crop_height)
    if right - left < 8 or bottom - top < 8:
        return None
    return rgb.crop((left, top, right, bottom))


def build_query_views(image: Image.Image) -> list[QueryView]:
    original = image.convert("RGB")
    views: list[QueryView] = [QueryView(name="original", image=original)]

    foreground = extract_foreground_crop(original)
    if foreground is not None:
        views.insert(0, QueryView(name="foreground", image=foreground))

    cropped = center_crop(original)
    if cropped is not None:
        views.append(QueryView(name="center", image=cropped))

    return views
