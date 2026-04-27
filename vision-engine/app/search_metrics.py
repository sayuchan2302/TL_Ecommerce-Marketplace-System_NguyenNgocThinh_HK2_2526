from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Lock


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
    total_grouped_candidates: int
    total_returned_candidates: int
    average_top_score: float | None
    average_grouped_candidates: float
    average_returned_candidates: float
    last_status: str | None
    last_top_score: float | None
    last_score_floor: float | None
    last_search_at: datetime | None


class SearchMetricsCollector:
    def __init__(self) -> None:
        self._lock = Lock()
        self._total_requests = 0
        self._accepted_requests = 0
        self._low_confidence_requests = 0
        self._empty_requests = 0
        self._invalid_content_type_requests = 0
        self._empty_payload_requests = 0
        self._oversized_payload_requests = 0
        self._decode_error_requests = 0
        self._total_grouped_candidates = 0
        self._total_returned_candidates = 0
        self._top_score_sum = 0.0
        self._top_score_count = 0
        self._last_status: str | None = None
        self._last_top_score: float | None = None
        self._last_score_floor: float | None = None
        self._last_search_at: datetime | None = None

    def record_request(
        self,
        *,
        status: str,
        grouped_candidates: int = 0,
        returned_candidates: int = 0,
        top_score: float | None = None,
        score_floor: float | None = None,
    ) -> None:
        with self._lock:
            self._total_requests += 1
            self._total_grouped_candidates += grouped_candidates
            self._total_returned_candidates += returned_candidates
            self._last_status = status
            self._last_top_score = top_score
            self._last_score_floor = score_floor
            self._last_search_at = datetime.now(timezone.utc)

            if top_score is not None:
                self._top_score_sum += top_score
                self._top_score_count += 1

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
            return SearchMetricsSnapshot(
                total_requests=self._total_requests,
                accepted_requests=self._accepted_requests,
                low_confidence_requests=self._low_confidence_requests,
                empty_requests=self._empty_requests,
                invalid_content_type_requests=self._invalid_content_type_requests,
                empty_payload_requests=self._empty_payload_requests,
                oversized_payload_requests=self._oversized_payload_requests,
                decode_error_requests=self._decode_error_requests,
                total_grouped_candidates=self._total_grouped_candidates,
                total_returned_candidates=self._total_returned_candidates,
                average_top_score=top_score_average,
                average_grouped_candidates=self._total_grouped_candidates / request_count,
                average_returned_candidates=self._total_returned_candidates / request_count,
                last_status=self._last_status,
                last_top_score=self._last_top_score,
                last_score_floor=self._last_score_floor,
                last_search_at=self._last_search_at,
            )
