from __future__ import annotations

from dataclasses import dataclass
from time import perf_counter

from .config import settings
from .image_validation import SearchValidationError, decode_search_image, validate_image_upload
from .models import SearchCandidate
from .openclip_service import OpenClipService
from .query_views import QueryView, build_query_views, center_crop, extract_foreground_crop
from .ranking import (
    RankedSearchCandidate,
    _build_product_ranking_score,
    _is_better_ranked_candidate,
    _normalize_slug,
    apply_candidate_thresholds,
    build_product_ranking_score,
    format_score,
    group_search_candidates,
    is_better_ranked_candidate,
    normalize_slug,
)
from .search_repository import SearchRepository


@dataclass(slots=True)
class SearchExecutionResult:
    candidates: list[SearchCandidate]
    grouped_candidate_count: int
    threshold_filtered_count: int
    top_score: float | None
    score_floor: float | None
    status: str
    empty_reason: str | None
    index_version: str
    search_latency_ms: float
    encode_latency_ms: float
    db_query_latency_ms: float


class ImageSearchService:
    def __init__(self, clip_service: OpenClipService, search_repository: SearchRepository | None = None) -> None:
        self.clip_service = clip_service
        self.search_repository = search_repository or SearchRepository()

    def search_bytes(
        self,
        *,
        content_type: str | None,
        payload: bytes,
        limit: int,
        category_slug: str | None,
        store_slug: str | None,
    ) -> SearchExecutionResult:
        search_started_at = perf_counter()
        validate_image_upload(content_type, payload)
        image = decode_search_image(payload)
        query_views = build_query_views(image)

        encode_started_at = perf_counter()
        vectors = self.clip_service.encode_images([view.image for view in query_views])
        encode_latency_ms = (perf_counter() - encode_started_at) * 1000

        rows, db_query_latency_ms = self.search_repository.query_similar_images_with_views(
            vectors=vectors,
            view_names=[view.name for view in query_views],
            limit=limit,
            category_slug=category_slug,
            store_slug=store_slug,
        )
        grouped_candidates = group_search_candidates(
            rows,
            category_slug=category_slug,
            apply_soft_category_boost=self.search_repository.should_apply_soft_category_boost(category_slug),
        )
        candidates, top_score, score_floor, status, empty_reason, threshold_filtered_count = apply_candidate_thresholds(
            grouped_candidates,
        )
        index_info = self.load_index_info()
        return SearchExecutionResult(
            candidates=candidates[:limit],
            grouped_candidate_count=len(grouped_candidates),
            threshold_filtered_count=threshold_filtered_count,
            top_score=top_score,
            score_floor=score_floor,
            status=status,
            empty_reason=empty_reason,
            index_version=str(index_info["index_version"]),
            search_latency_ms=(perf_counter() - search_started_at) * 1000,
            encode_latency_ms=encode_latency_ms,
            db_query_latency_ms=db_query_latency_ms,
        )

    def load_index_info(self, *, force_refresh: bool = False) -> dict[str, int | str | None]:
        return self.search_repository.load_index_info(force_refresh=force_refresh)

    def refresh_index_info(self) -> dict[str, int | str | None]:
        return self.search_repository.refresh_index_info()


__all__ = [
    "ImageSearchService",
    "QueryView",
    "RankedSearchCandidate",
    "SearchExecutionResult",
    "SearchRepository",
    "SearchValidationError",
    "_build_product_ranking_score",
    "_is_better_ranked_candidate",
    "_normalize_slug",
    "apply_candidate_thresholds",
    "build_product_ranking_score",
    "build_query_views",
    "center_crop",
    "decode_search_image",
    "extract_foreground_crop",
    "format_score",
    "group_search_candidates",
    "is_better_ranked_candidate",
    "normalize_slug",
    "settings",
    "validate_image_upload",
]
