from __future__ import annotations

from collections import OrderedDict
from io import BytesIO
import logging

from fastapi import FastAPI, File, Header, HTTPException, Query, UploadFile
from PIL import Image

from .catalog_sync import CatalogSyncService
from .config import settings
from .db import bootstrap_database, get_connection
from .models import IndexInfoResponse, SearchCandidate, SearchMetricsResponse, SearchResponse, SyncCatalogResponse
from .openclip_service import OpenClipService
from .search_metrics import SearchMetricsCollector


app = FastAPI(title=settings.app_name)
clip_service: OpenClipService | None = None
catalog_sync_service: CatalogSyncService | None = None
logger = logging.getLogger("uvicorn.error")
search_metrics = SearchMetricsCollector()


@app.on_event("startup")
def startup_event() -> None:
    global clip_service, catalog_sync_service
    bootstrap_database()
    clip_service = OpenClipService()
    catalog_sync_service = CatalogSyncService(clip_service)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/ready")
def ready() -> dict[str, bool]:
    if clip_service is None:
        return {"ready": False}
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
    except Exception:  # noqa: BLE001
        return {"ready": False}
    return {"ready": True}


@app.get("/v1/index/info", response_model=IndexInfoResponse)
def index_info() -> IndexInfoResponse:
    info = _load_index_info()
    return IndexInfoResponse(
        ready=clip_service is not None,
        model_name=settings.openclip_model_name,
        model_pretrained=settings.openclip_pretrained,
        embedding_dimension=settings.embedding_dimension,
        active_image_count=info["active_image_count"],
        active_product_count=info["active_product_count"],
        index_version=info["index_version"],
    )


@app.post("/v1/admin/sync-catalog", response_model=SyncCatalogResponse)
def sync_catalog(x_vision_internal_secret: str | None = Header(default=None)) -> SyncCatalogResponse:
    _ensure_internal_secret(x_vision_internal_secret)
    if catalog_sync_service is None:
        raise HTTPException(status_code=503, detail="OpenCLIP model is not ready")
    return catalog_sync_service.run_full_sync()


@app.get("/v1/metrics", response_model=SearchMetricsResponse)
def metrics(x_vision_internal_secret: str | None = Header(default=None)) -> SearchMetricsResponse:
    _ensure_internal_secret(x_vision_internal_secret)
    snapshot = search_metrics.snapshot()
    return SearchMetricsResponse(
        total_requests=snapshot.total_requests,
        accepted_requests=snapshot.accepted_requests,
        low_confidence_requests=snapshot.low_confidence_requests,
        empty_requests=snapshot.empty_requests,
        invalid_content_type_requests=snapshot.invalid_content_type_requests,
        empty_payload_requests=snapshot.empty_payload_requests,
        oversized_payload_requests=snapshot.oversized_payload_requests,
        decode_error_requests=snapshot.decode_error_requests,
        total_grouped_candidates=snapshot.total_grouped_candidates,
        total_returned_candidates=snapshot.total_returned_candidates,
        average_top_score=snapshot.average_top_score,
        average_grouped_candidates=snapshot.average_grouped_candidates,
        average_returned_candidates=snapshot.average_returned_candidates,
        last_status=snapshot.last_status,
        last_top_score=snapshot.last_top_score,
        last_score_floor=snapshot.last_score_floor,
        last_search_at=snapshot.last_search_at,
    )


@app.post("/v1/search/image", response_model=SearchResponse)
async def search_image(
    file: UploadFile = File(...),
    limit: int = Query(default=120, ge=1, le=120),
    category_slug: str | None = Query(default=None),
    store_slug: str | None = Query(default=None),
    x_vision_internal_secret: str | None = Header(default=None),
) -> SearchResponse:
    _ensure_internal_secret(x_vision_internal_secret)

    if clip_service is None:
        raise HTTPException(status_code=503, detail="OpenCLIP model is not ready")
    if not (file.content_type or "").lower().startswith("image/"):
        search_metrics.record_request(status="invalid_content_type")
        raise HTTPException(status_code=400, detail="Uploaded file must be an image")

    payload = await file.read()
    if not payload:
        search_metrics.record_request(status="empty_payload")
        raise HTTPException(status_code=400, detail="Image file is required")
    if len(payload) > settings.max_upload_size_bytes:
        search_metrics.record_request(status="oversized_payload")
        raise HTTPException(status_code=413, detail="Image file is too large")

    try:
        image = Image.open(BytesIO(payload)).convert("RGB")
    except Exception as exc:  # noqa: BLE001
        search_metrics.record_request(status="decode_error")
        raise HTTPException(status_code=400, detail="Unable to decode image") from exc

    vector = clip_service.encode_image(image)
    rows = _query_similar_images(vector, limit, category_slug, store_slug)

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

    grouped_candidates = list(grouped.values())
    candidates, top_score, score_floor, search_status = _apply_candidate_thresholds(grouped_candidates)
    candidates = candidates[:limit]
    logger.info(
        "image_search status=%s content_type=%s bytes=%s grouped=%s returned=%s top_score=%s score_floor=%s category_slug=%s store_slug=%s",
        search_status,
        file.content_type or "unknown",
        len(payload),
        len(grouped_candidates),
        len(candidates),
        _format_score(top_score),
        _format_score(score_floor),
        category_slug or "-",
        store_slug or "-",
    )
    search_metrics.record_request(
        status=search_status,
        grouped_candidates=len(grouped_candidates),
        returned_candidates=len(candidates),
        top_score=top_score,
        score_floor=score_floor,
    )
    return SearchResponse(
        candidates=candidates,
        total_candidates=len(candidates),
        index_version=_load_index_info()["index_version"],
    )


def _query_similar_images(vector, limit: int, category_slug: str | None, store_slug: str | None) -> list[dict]:
    ann_limit = min(max(limit * settings.search_candidate_multiplier, limit), settings.search_candidate_cap)
    filters = ["is_active = true"]
    params: list = []

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


def _load_index_info() -> dict[str, int | str | None]:
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


def _apply_candidate_thresholds(
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


def _format_score(value: float | None) -> str:
    if value is None:
        return "-"
    return f"{value:.4f}"


def _ensure_internal_secret(provided_secret: str | None) -> None:
    if not settings.vision_internal_secret:
        raise HTTPException(status_code=503, detail="Vision internal secret is not configured")
    if not provided_secret or provided_secret != settings.vision_internal_secret:
        raise HTTPException(status_code=403, detail="Invalid vision internal secret")
