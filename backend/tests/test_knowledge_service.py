import json
import tempfile
import unittest
from unittest import mock
from pathlib import Path

from knowledge.service import KnowledgeService, _resolve_command


def _write(path: Path, content: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class KnowledgeServiceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.repo_root = Path(self.tmp.name)
        vault_root = self.repo_root / "knowledge" / "justhireme-obsidian-vault"
        _write(
            self.repo_root / "knowledge.manifest.json",
            json.dumps({"vaultPath": "knowledge/justhireme-obsidian-vault"}),
        )
        _write(
            vault_root / "Home.md",
            "---\ntitle: Home\n---\n# Home\n\nThis is the vault home.\n",
        )
        _write(
            vault_root / "wiki" / "dashboards" / "open-questions.md",
            "---\ntitle: Open Questions\n---\n- First question\n- Second question\n",
        )
        _write(
            vault_root / "wiki" / "candidates" / "concepts" / "lead.md",
            "---\npage_id: concept:lead\nkind: concept\ntitle: lead\nsource_ids:\n  - source-a\n---\n# lead\n\nCandidate page body.\n",
        )
        _write(
            vault_root / "wiki" / "graph" / "report.md",
            "---\npage_id: graph:report\nkind: report\ntitle: Graph Report\n---\n# Report\n\nBody.\n",
        )
        graph = {
            "generatedAt": "2026-05-07T06:20:20.000Z",
            "sources": [{"id": "source-a"}],
            "nodes": [{"id": "concept:lead", "type": "concept", "label": "lead"}],
            "edges": [],
            "communities": [],
            "pages": [
                {"id": "concept:lead", "path": "candidates/concepts/lead.md", "title": "lead", "kind": "concept", "sourceIds": ["source-a"]},
                {"id": "graph:report", "path": "graph/report.md", "title": "Graph Report", "kind": "report"},
            ],
        }
        _write(vault_root / "state" / "graph.json", json.dumps(graph))

    def tearDown(self):
        self.tmp.cleanup()

    def test_summary_and_page_detail_read_from_vault(self):
        service = KnowledgeService(self.repo_root)
        summary = service.summary_payload()
        self.assertTrue(summary["enabled"])
        self.assertEqual(summary["sourceCount"], 1)
        self.assertEqual(summary["pageCount"], 2)
        self.assertIn("First question", summary["openQuestions"])

        detail = service.page_detail(path="candidates/concepts/lead.md")
        self.assertIsNotNone(detail)
        self.assertEqual(detail["title"], "lead")
        self.assertEqual(detail["reviewStatus"], "pending")

    def test_candidate_review_state_changes_effective_status(self):
        service = KnowledgeService(self.repo_root)
        payload = service.candidates_payload()
        self.assertEqual(payload["counts"]["pending"], 1)

        reviewed = service.review_candidate("candidates/concepts/lead.md", "promote")
        self.assertEqual(reviewed["page"]["reviewStatus"], "promoted")

        payload = service.candidates_payload("promoted")
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["counts"]["promoted"], 1)

        reset = service.review_candidate("candidates/concepts/lead.md", "reset")
        self.assertEqual(reset["page"]["reviewStatus"], "pending")

    def test_refresh_command_resolves_shell_shims(self):
        def fake_which(name: str):
            return "C:/tools/npx.cmd" if name == "npx.cmd" else None

        with mock.patch("knowledge.service.os.name", "nt"), mock.patch("knowledge.service.shutil.which", side_effect=fake_which):
            resolved = _resolve_command(["npx", "@swarmvaultai/cli", "compile"])

        self.assertEqual(resolved[1:], ["@swarmvaultai/cli", "compile"])
        self.assertEqual(Path(resolved[0]).name.lower(), "npx.cmd")


if __name__ == "__main__":
    unittest.main()
