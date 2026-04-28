from __future__ import annotations

from pathlib import Path
import sys
import unittest


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.search_metrics import SearchMetricsCollector, _calculate_percentile  # noqa: E402


class SearchMetricsCollectorTests(unittest.TestCase):
    def test_calculate_percentile_returns_interpolated_value(self) -> None:
        values = [10.0, 20.0, 30.0, 40.0]

        self.assertEqual(_calculate_percentile(values, 0.50), 25.0)
        self.assertAlmostEqual(_calculate_percentile(values, 0.95), 38.5)
        self.assertAlmostEqual(_calculate_percentile(values, 0.99), 39.7)

    def test_collector_keeps_bounded_latency_window(self) -> None:
        collector = SearchMetricsCollector(window_size=3)

        for value in [10.0, 20.0, 30.0, 40.0]:
            collector.record_request(
                status="accepted",
                search_latency_ms=value,
                encode_latency_ms=value / 2,
                db_query_latency_ms=value / 4,
            )

        snapshot = collector.snapshot()

        self.assertEqual(snapshot.total_requests, 4)
        self.assertAlmostEqual(snapshot.search_latency_p50_ms, 30.0)
        self.assertAlmostEqual(snapshot.search_latency_p95_ms, 39.0)
        self.assertAlmostEqual(snapshot.search_latency_p99_ms, 39.8)
        self.assertAlmostEqual(snapshot.encode_latency_p50_ms, 15.0)
        self.assertAlmostEqual(snapshot.db_query_latency_p50_ms, 7.5)


if __name__ == "__main__":
    unittest.main()
