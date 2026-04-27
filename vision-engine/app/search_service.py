from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from io import BytesIO
from typing import Any

from PIL import Image

from .config import settings
from .db import get_connection
from .models import SearchCandidate
from .openclip_service import OpenClipService


class SearchValidationError(Exception):
    def __init__(self, status_code: int, detail: str, metrics_status: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.metrics_status = metrics_status


@dataclass(slots=True)
class SearchExecutionResult:
    candidates: list[SearchCandidate]
    grouped_candidate_count: int
    top_score: float | None
    score_floor: float | None
    status: str
    index_version: str


def validate_image_upload(content_type: str | None, payload: bytes) -> None:
    if not (content_type or "").lower().startswith("image/"):
        raise SearchValidationError(400, "Uploaded file must be an image", "invalid_content_type")
    if not payload:
        raise SearchValidationError(400, "Image file is required", "empty_payload")
    if len(payload) > settings.max_upload_size_bytes:
        raise SearchValidationError(413, "Image file is too large", "oversized_payload")


def decode_search_image(payload: bytes) -> Image.Image:
    try:
        return Image.open(BytesIO(payload)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        raise SearchValidationError(400, "Unable to decode image", "decode_error") from exc


def group_search_candidates(rows: list[dict[str, Any]]) -> list[SearchCandidate]:
    grouped: OrderedDict[str, SearchCandidate] = OrderedDict()
    for row in rows:
        key = str(row["backend_product_id"])
        candidate = SearchCandidate(
            backend_product_id=row["backend_product_id"],
            score=float(row["score"]),
            matched_image_url=row["image_url"],
            matched_image_index=int(row["image_index"] or 0),
            is_primary=bool(row["is_primary"]),
        )
        existing = grouped.get(key)
        if existing is None:
            grouped[key] = candidate
            continue
        if candidate.score > existing.score:
            grouped[key] = candidate
            continue
        if candidate.score == existing.score:
            if candidate.is_primary and not existing.is_primary:
                grouped[key] = candidate
            elif candidate.is_primary == existing.is_primary and candidate.matched_image_index < existing.matched_image_index:
                grouped[key] = candidate
    return list(grouped.values())


def apply_candidate_thresholds(
    candidates: list[SearchCandidate],
) -> tuple[list[SearchCandidate], float | None, float | None, str]:
    if not candidates:
        return [], None, None, "empty"

    ranked = sorted(
        candidates,
        key=lambda item: (-item.score, not item.is_primary, item.matched_image_index),
    )
    top_score = ranked[0].score
    score_floor = max(
        settings.image_search_absolute_score_floor,
        top_score * settings.image_search_relative_score_floor,
    )
    if top_score < settings.image_search_min_confidence_score:
        return [], top_score, score_floor, "low_confidence"

    filtered = [candidate for candidate in ranked if candidate.score >= score_floor]
    return filtered, top_score, score_floor, "accepted"


def format_score(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.4f}"


class ImageSearchService:
    def __init__(self, clip_service: OpenClipService) -> None:
        self.clip_service = clip_service

    def search_bytes(
        self,
        *,
        content_type: str | None,
        payload: bytes,
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> SearchExecutionResult:
        validate_image_upload(content_type, payload)
        image = decode_search_image(payload)
        vector = self.clip_service.encode_image(image)
        rows = self._query_similar_images(vector, limit, category_slug, store_slug)
        grouped_candidates = group_search_candidates(rows)
        candidates, top_score, score_floor, status = apply_candidate_thresholds(grouped_candidates)
        index_info = self.load_index_info()
        return SearchExecutionResult(
            candidates=candidates[:limit],
            grouped_candidate_count=len(grouped_candidates),
            top_score=top_score,
            score_floor=score_floor,
            status=status,
            index_version=str(index_info["index_version"]),
        )

    def load_index_info(self) -> dict[str, int | str | None]:
        sql = """
            SELECT
                COUNT(*) FILTER (WHERE is_active = true) AS active_image_count,
                COUNT(DISTINCT backend_product_id) FILTER (WHERE is_active = true) AS active_product_count,
                (
                    SELECT sync_token
                    FROM vision.product_image_embeddings
                    WHERE is_active = true
                    ORDER BY updated_at DESC
                    LIMIT 1
                ) AS index_version
            FROM vision.product_image_embeddings
        """
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                row = cur.fetchone()

        return {
            "active_image_count": int(row[0] or 0),
            "active_product_count": int(row[1] or 0),
            "index_version": row[2] or "empty",
        }

    def _query_similar_images(
        self,
        vector,
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> list[dict[str, Any]]:
        ann_limit = min(max(limit * settings.search_candidate_multiplier, limit), settings.search_candidate_cap)
        filters = ["is_active = true"]
        params: list[Any] = []

        if category_slug:
            filters.append("category_slug = %s")
            params.append(category_slug)
        if store_slug:
            filters.append("store_slug = %s")
            params.append(store_slug)

        where_sql = " AND ".join(filters)
        sql = f"""
            SELECT
                backend_product_id,
                image_url,
                image_index,
                is_primary,
                1 - (embedding <=> %s) AS score
            FROM vision.product_image_embeddings
            WHERE {where_sql}
            ORDER BY embedding <=> %s
            LIMIT %s
        """

        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, [vector, *params, vector, ann_limit])
                rows = cur.fetchall()

        return [
            {
                "backend_product_id": row[0],
                "image_url": row[1],
                "image_index": row[2],
                "is_primary": row[3],
                "score": row[4],
            }
            for row in rows
        ]
