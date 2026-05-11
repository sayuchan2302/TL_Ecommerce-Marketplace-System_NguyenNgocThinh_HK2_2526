from __future__ import annotations

from concurrent.futures import Future, ThreadPoolExecutor
from dataclasses import dataclass
from datetime import UTC, datetime
from threading import Lock
from uuid import uuid4

from .catalog_sync import CatalogSyncService
from .models import SyncCatalogJobStartResponse, SyncCatalogJobStatusResponse, SyncCatalogResponse


class SyncCatalogJobNotFoundError(Exception):
    pass


@dataclass
class SyncCatalogJob:
    job_id: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    result: SyncCatalogResponse | None = None
    error: str | None = None
    future: Future | None = None


class SyncCatalogJobService:
    def __init__(self, catalog_sync_service: CatalogSyncService, on_success=None) -> None:
        self.catalog_sync_service = catalog_sync_service
        self.on_success = on_success
        self._executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="catalog-sync")
        self._lock = Lock()
        self._jobs: dict[str, SyncCatalogJob] = {}
        self._running_job_id: str | None = None

    def close(self) -> None:
        self._executor.shutdown(wait=False, cancel_futures=False)

    def start(self) -> SyncCatalogJobStartResponse:
        with self._lock:
            if self.catalog_sync_service.is_running():
                raise CatalogSyncJobInProgressError("Catalog sync is already running")
            if self._running_job_id is not None:
                running = self._jobs.get(self._running_job_id)
                if running is not None and running.status == "running":
                    raise CatalogSyncJobInProgressError("Catalog sync is already running")

            job = SyncCatalogJob(
                job_id=str(uuid4()),
                status="running",
                started_at=datetime.now(UTC),
            )
            self._jobs[job.job_id] = job
            self._running_job_id = job.job_id
            job.future = self._executor.submit(self._run_job, job.job_id)
            return SyncCatalogJobStartResponse(
                job_id=job.job_id,
                status=job.status,
                started_at=job.started_at,
            )

    def get(self, job_id: str) -> SyncCatalogJobStatusResponse:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None:
                raise SyncCatalogJobNotFoundError(job_id)
            return self._to_response(job)

    def _run_job(self, job_id: str) -> None:
        try:
            result = self.catalog_sync_service.run_full_sync()
            if self.on_success is not None:
                self.on_success()
            with self._lock:
                job = self._jobs[job_id]
                job.status = "success"
                job.result = result
                job.finished_at = datetime.now(UTC)
                self._running_job_id = None
        except Exception as exc:  # noqa: BLE001
            with self._lock:
                job = self._jobs[job_id]
                job.status = "error"
                job.error = str(exc)
                job.finished_at = datetime.now(UTC)
                self._running_job_id = None

    def _to_response(self, job: SyncCatalogJob) -> SyncCatalogJobStatusResponse:
        return SyncCatalogJobStatusResponse(
            job_id=job.job_id,
            status=job.status,
            started_at=job.started_at,
            finished_at=job.finished_at,
            result=job.result,
            error=job.error,
        )


class CatalogSyncJobInProgressError(Exception):
    pass
