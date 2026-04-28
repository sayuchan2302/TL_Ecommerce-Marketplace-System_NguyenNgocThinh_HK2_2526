from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Lock

from .config import settings


def _calculate_percentile(values: list[float], percentile: float) -> float:
    if not values:
        return 0.0

    normalized = min(max(percentile, 0.0), 1.0)
    ranked = sorted(values)
    if len(ranked) == 1:
        return float(ranked[0])

    position = normalized * (len(ranked) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ranked) - 1)
    lower_value = ranked[lower_index]
    upper_value = ranked[upper_index]
    weight = position - lower_index
    return float(lower_value + (upper_value - lower_value) * weight)


@dataclass(slots=True)
class SearchMetricsSnapshot:
    total_requests: int
    accepted_requests: int
    low_confidence_requests: int
    empty_requests: int
    invalid_content_type_requests: int
    empty_payload_requests: int
    oversized_payload_requests: int
    decode_error_requests: int
    threshold_filtered_candidates: int
    total_grouped_candidates: int
    total_returned_candidates: int
    average_top_score: float | None
    average_grouped_candidates: float
    average_returned_candidates: float
    average_search_latency_ms: float
    average_encode_latency_ms: float
    average_db_query_latency_ms: float
    search_latency_p50_ms: float
    search_latency_p95_ms: float
    search_latency_p99_ms: float
    encode_latency_p50_ms: float
    encode_latency_p95_ms: float
    encode_latency_p99_ms: float
    db_query_latency_p50_ms: float
    db_query_latency_p95_ms: float
    db_query_latency_p99_ms: float
    last_status: str | None
    last_empty_reason: str | None
    last_top_score: float | None
    last_score_floor: float | None
    last_search_latency_ms: float | None
    last_encode_latency_ms: float | None
    last_db_query_latency_ms: float | None
    last_search_at: datetime | None
    empty_reason_counts: dict[str, int] = field(default_factory=dict)


class SearchMetricsCollector:
    def __init__(self, window_size: int | None = None) -> None:
        self._lock = Lock()
        self._window_size = max(1, window_size or settings.metrics_window_size)
        self._total_requests = 0
        self._accepted_requests = 0
        self._low_confidence_requests = 0
        self._empty_requests = 0
        self._invalid_content_type_requests = 0
        self._empty_payload_requests = 0
        self._oversized_payload_requests = 0
        self._decode_error_requests = 0
        self._threshold_filtered_candidates = 0
        self._total_grouped_candidates = 0
        self._total_returned_candidates = 0
        self._top_score_sum = 0.0
        self._top_score_count = 0
        self._search_latency_sum_ms = 0.0
        self._encode_latency_sum_ms = 0.0
        self._db_query_latency_sum_ms = 0.0
        self._latency_sample_count = 0
        self._search_latency_samples_ms: deque[float] = deque(maxlen=self._window_size)
        self._encode_latency_samples_ms: deque[float] = deque(maxlen=self._window_size)
        self._db_query_latency_samples_ms: deque[float] = deque(maxlen=self._window_size)
        self._last_status: str | None = None
        self._last_empty_reason: str | None = None
        self._last_top_score: float | None = None
        self._last_score_floor: float | None = None
        self._last_search_latency_ms: float | None = None
        self._last_encode_latency_ms: float | None = None
        self._last_db_query_latency_ms: float | None = None
        self._last_search_at: datetime | None = None
        self._empty_reason_counts: dict[str, int] = {}

    def record_request(
        self,
        *,
        status: str,
        grouped_candidates: int = 0,
        returned_candidates: int = 0,
        threshold_filtered_count: int = 0,
        top_score: float | None = None,
        score_floor: float | None = None,
        empty_reason: str | None = None,
        search_latency_ms: float | None = None,
        encode_latency_ms: float | None = None,
        db_query_latency_ms: float | None = None,
    ) -> None:
        with self._lock:
            self._total_requests += 1
            self._threshold_filtered_candidates += max(0, threshold_filtered_count)
            self._total_grouped_candidates += grouped_candidates
            self._total_returned_candidates += returned_candidates
            self._last_status = status
            self._last_empty_reason = empty_reason
            self._last_top_score = top_score
            self._last_score_floor = score_floor
            self._last_search_latency_ms = search_latency_ms
            self._last_encode_latency_ms = encode_latency_ms
            self._last_db_query_latency_ms = db_query_latency_ms
            self._last_search_at = datetime.now(timezone.utc)

            if top_score is not None:
                self._top_score_sum += top_score
                self._top_score_count += 1

            if search_latency_ms is not None:
                self._search_latency_sum_ms += search_latency_ms
                self._encode_latency_sum_ms += encode_latency_ms or 0.0
                self._db_query_latency_sum_ms += db_query_latency_ms or 0.0
                self._latency_sample_count += 1
                self._search_latency_samples_ms.append(float(search_latency_ms))
                self._encode_latency_samples_ms.append(float(encode_latency_ms or 0.0))
                self._db_query_latency_samples_ms.append(float(db_query_latency_ms or 0.0))

            if empty_reason:
                self._empty_reason_counts[empty_reason] = self._empty_reason_counts.get(empty_reason, 0) + 1

            if status == "accepted":
                self._accepted_requests += 1
            elif status == "low_confidence":
                self._low_confidence_requests += 1
            elif status == "empty":
                self._empty_requests += 1
            elif status == "invalid_content_type":
                self._invalid_content_type_requests += 1
            elif status == "empty_payload":
                self._empty_payload_requests += 1
            elif status == "oversized_payload":
                self._oversized_payload_requests += 1
            elif status == "decode_error":
                self._decode_error_requests += 1

    def snapshot(self) -> SearchMetricsSnapshot:
        with self._lock:
            top_score_average = None
            if self._top_score_count > 0:
                top_score_average = self._top_score_sum / self._top_score_count

            request_count = self._total_requests if self._total_requests > 0 else 1
            latency_sample_count = self._latency_sample_count if self._latency_sample_count > 0 else 1
            search_latency_values = list(self._search_latency_samples_ms)
            encode_latency_values = list(self._encode_latency_samples_ms)
            db_query_latency_values = list(self._db_query_latency_samples_ms)
            return SearchMetricsSnapshot(
                total_requests=self._total_requests,
                accepted_requests=self._accepted_requests,
                low_confidence_requests=self._low_confidence_requests,
                empty_requests=self._empty_requests,
                invalid_content_type_requests=self._invalid_content_type_requests,
                empty_payload_requests=self._empty_payload_requests,
                oversized_payload_requests=self._oversized_payload_requests,
                decode_error_requests=self._decode_error_requests,
                threshold_filtered_candidates=self._threshold_filtered_candidates,
                total_grouped_candidates=self._total_grouped_candidates,
                total_returned_candidates=self._total_returned_candidates,
                average_top_score=top_score_average,
                average_grouped_candidates=self._total_grouped_candidates / request_count,
                average_returned_candidates=self._total_returned_candidates / request_count,
                average_search_latency_ms=self._search_latency_sum_ms / latency_sample_count,
                average_encode_latency_ms=self._encode_latency_sum_ms / latency_sample_count,
                average_db_query_latency_ms=self._db_query_latency_sum_ms / latency_sample_count,
                search_latency_p50_ms=_calculate_percentile(search_latency_values, 0.50),
                search_latency_p95_ms=_calculate_percentile(search_latency_values, 0.95),
                search_latency_p99_ms=_calculate_percentile(search_latency_values, 0.99),
                encode_latency_p50_ms=_calculate_percentile(encode_latency_values, 0.50),
                encode_latency_p95_ms=_calculate_percentile(encode_latency_values, 0.95),
                encode_latency_p99_ms=_calculate_percentile(encode_latency_values, 0.99),
                db_query_latency_p50_ms=_calculate_percentile(db_query_latency_values, 0.50),
                db_query_latency_p95_ms=_calculate_percentile(db_query_latency_values, 0.95),
                db_query_latency_p99_ms=_calculate_percentile(db_query_latency_values, 0.99),
                last_status=self._last_status,
                last_empty_reason=self._last_empty_reason,
                last_top_score=self._last_top_score,
                last_score_floor=self._last_score_floor,
                last_search_latency_ms=self._last_search_latency_ms,
                last_encode_latency_ms=self._last_encode_latency_ms,
                last_db_query_latency_ms=self._last_db_query_latency_ms,
                last_search_at=self._last_search_at,
                empty_reason_counts=dict(self._empty_reason_counts),
            )
