import os
import sys
import types
import unittest
from pathlib import Path
from unittest import mock

os.environ["LOCALAPPDATA"] = str(Path(__file__).resolve().parent)
os.makedirs = lambda *_args, **_kwargs: None


class _FakeResult:
    def has_next(self):
        return False

    def get_next(self):
        return [0]


class _FakeConnection:
    def execute(self, *_args, **_kwargs):
        return _FakeResult()


class _FakeSqlConnection:
    def executescript(self, *_args, **_kwargs):
        return self

    def execute(self, *_args, **_kwargs):
        return self

    def fetchone(self):
        return None

    def fetchall(self):
        return []

    def commit(self):
        return None

    def close(self):
        return None


class _FakeVectorStore:
    def list_tables(self):
        return []

    def create_table(self, *_args, **_kwargs):
        return None

    def open_table(self, *_args, **_kwargs):
        return self

    def add(self, *_args, **_kwargs):
        return None


sys.modules.setdefault(
    "kuzu",
    types.SimpleNamespace(
        Database=lambda _path: object(),
        Connection=lambda _db: _FakeConnection(),
    ),
)
sys.modules["sqlite3"] = types.SimpleNamespace(connect=lambda _path: _FakeSqlConnection())
sys.modules.setdefault(
    "lancedb",
    types.SimpleNamespace(
        LanceDBConnection=_FakeVectorStore,
        connect=lambda _path: _FakeVectorStore(),
    ),
)

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

main._API_TOKEN = "test-token-knowledge"
CLIENT = TestClient(main.app, raise_server_exceptions=False)
AUTH = {"Authorization": "Bearer test-token-knowledge"}


class TestKnowledgeApi(unittest.TestCase):
    def test_status_endpoint_returns_manifest_and_candidate_counts(self):
        resp = CLIENT.get("/api/v1/knowledge/status", headers=AUTH)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("manifest", data)
        self.assertIn("candidateCounts", data)
        self.assertIn("stale", data)
        self.assertIn("changedSources", data)

    def test_candidates_endpoint_returns_items(self):
        resp = CLIENT.get("/api/v1/knowledge/candidates?status=pending", headers=AUTH)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertTrue(data["enabled"])
        self.assertIsInstance(data["items"], list)

    def test_candidate_review_round_trip(self):
        promote = CLIENT.post(
            "/api/v1/knowledge/candidates/review",
            headers=AUTH,
            json={"page_id": "concept:acceptance", "action": "promote"},
        )
        self.assertEqual(promote.status_code, 200)
        self.assertEqual(promote.json()["page"]["reviewStatus"], "promoted")

        reset = CLIENT.post(
            "/api/v1/knowledge/candidates/review",
            headers=AUTH,
            json={"page_id": "concept:acceptance", "action": "reset"},
        )
        self.assertEqual(reset.status_code, 200)
        self.assertEqual(reset.json()["page"]["reviewStatus"], "pending")

    def test_refresh_endpoint_returns_status_payload(self):
        async def _fake_refresh():
            return {
                "enabled": True,
                "refreshing": True,
                "lastRefreshAt": None,
                "lastRefreshStatus": "running",
                "lastRefreshError": "",
                "lastRefreshSummary": None,
                "manifest": {"version": 1, "vaultPath": "knowledge/justhireme-obsidian-vault", "refreshCommand": [], "sourceGroups": [], "excludePaths": []},
                "candidateCounts": {"pending": 0, "promoted": 0, "archived": 0},
                "compiledAt": None,
                "sourceCount": 0,
                "pageCount": 0,
                "nodeCount": 0,
                "edgeCount": 0,
                "stale": False,
                "latestSourceAt": None,
                "changedSourceCount": 0,
                "changedSources": [],
            }

        with mock.patch.object(main._knowledge, "start_refresh", side_effect=_fake_refresh):
            resp = CLIENT.post("/api/v1/knowledge/refresh", headers=AUTH)
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["refreshing"])


if __name__ == "__main__":
    unittest.main()
