from __future__ import annotations

from pathlib import Path
import sys
from threading import Event
import unittest
from unittest.mock import Mock


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.catalog_sync_jobs import CatalogSyncJobInProgressError, SyncCatalogJobService  # noqa: E402
from app.models import SyncCatalogResponse  # noqa: E402


class SyncCatalogJobServiceTests(unittest.TestCase):
    def test_start_and_status_success(self) -> None:
        catalog_sync = Mock()
        catalog_sync.is_running.return_value = False
        catalog_sync.run_full_sync.return_value = self._sync_response()
        on_success = Mock()
        service = SyncCatalogJobService(catalog_sync, on_success=on_success)
        try:
            started = service.start()
            self._wait_for_job(service, started.job_id)

            status = service.get(started.job_id)

            self.assertEqual(started.status, "running")
            self.assertEqual(status.status, "success")
            self.assertIsNotNone(status.finished_at)
            self.assertEqual(status.result.sync_token, "sync-token")
            on_success.assert_called_once()
        finally:
            service.close()

    def test_start_rejects_parallel_job(self) -> None:
        release = Event()

        def run_sync():
            release.wait(timeout=1)
            return self._sync_response()

        catalog_sync = Mock()
        catalog_sync.is_running.return_value = False
        catalog_sync.run_full_sync.side_effect = run_sync
        service = SyncCatalogJobService(catalog_sync)
        try:
            started = service.start()

            with self.assertRaises(CatalogSyncJobInProgressError):
                service.start()

            release.set()
            self._wait_for_job(service, started.job_id)
        finally:
            release.set()
            service.close()

    def test_start_rejects_when_legacy_sync_is_running(self) -> None:
        catalog_sync = Mock()
        catalog_sync.is_running.return_value = True
        service = SyncCatalogJobService(catalog_sync)
        try:
            with self.assertRaises(CatalogSyncJobInProgressError):
                service.start()
        finally:
            service.close()

    def test_status_records_failure(self) -> None:
        catalog_sync = Mock()
        catalog_sync.is_running.return_value = False
        catalog_sync.run_full_sync.side_effect = RuntimeError("boom")
        service = SyncCatalogJobService(catalog_sync)
        try:
            started = service.start()
            self._wait_for_job(service, started.job_id)

            status = service.get(started.job_id)

            self.assertEqual(status.status, "error")
            self.assertEqual(status.error, "boom")
            self.assertIsNotNone(status.finished_at)
        finally:
            service.close()

    def _wait_for_job(self, service: SyncCatalogJobService, job_id: str) -> None:
        future = service._jobs[job_id].future
        self.assertIsNotNone(future)
        future.result(timeout=2)

    def _sync_response(self) -> SyncCatalogResponse:
        return SyncCatalogResponse(
            synced_rows=1,
            failed_rows=0,
            deactivated_rows=0,
            images_processed=1,
            embeddings_inserted=1,
            embeddings_updated=0,
            skipped_unchanged=0,
            failed_images=0,
            inactive_stale_rows=0,
            sync_token="sync-token",
            index_version="sync-token",
            failures=[],
        )


if __name__ == "__main__":
    unittest.main()
