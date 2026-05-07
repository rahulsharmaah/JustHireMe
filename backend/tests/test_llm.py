import importlib
import sys
import types
import unittest
from unittest import mock


def _load_llm_with_stubbed_db():
    fake_db_pkg = types.ModuleType("db")
    fake_db_client = types.ModuleType("db.client")
    fake_db_client.get_setting = lambda *_args, **_kwargs: ""
    fake_db_pkg.client = fake_db_client

    saved_db = sys.modules.get("db")
    saved_db_client = sys.modules.get("db.client")
    saved_llm = sys.modules.pop("llm", None)
    try:
        sys.modules["db"] = fake_db_pkg
        sys.modules["db.client"] = fake_db_client
        return importlib.import_module("llm")
    finally:
        if saved_llm is not None:
            sys.modules["llm"] = saved_llm
        else:
            sys.modules.pop("llm", None)
        if saved_db is not None:
            sys.modules["db"] = saved_db
        else:
            sys.modules.pop("db", None)
        if saved_db_client is not None:
            sys.modules["db.client"] = saved_db_client
        else:
            sys.modules.pop("db.client", None)


class OllamaAliasResolutionTests(unittest.TestCase):
    def test_exact_model_match_is_preserved(self):
        llm = _load_llm_with_stubbed_db()
        with mock.patch.object(llm, "_fetch_ollama_model_ids", return_value=("gemma2:2b", "llama3.2:1b")):
            resolved = llm._resolve_ollama_model_alias("http://localhost:11434/v1", "gemma2:2b")
        self.assertEqual(resolved, "gemma2:2b")

    def test_family_alias_resolves_to_installed_tagged_model(self):
        llm = _load_llm_with_stubbed_db()
        with mock.patch.object(llm, "_fetch_ollama_model_ids", return_value=("gemma2:2b", "llama3.2:1b")):
            resolved = llm._resolve_ollama_model_alias("http://localhost:11434/v1", "gemma2")
        self.assertEqual(resolved, "gemma2:2b")

    def test_unknown_alias_falls_back_to_original_value(self):
        llm = _load_llm_with_stubbed_db()
        with mock.patch.object(llm, "_fetch_ollama_model_ids", return_value=("gemma2:2b", "llama3.2:1b")):
            resolved = llm._resolve_ollama_model_alias("http://localhost:11434/v1", "mistral")
        self.assertEqual(resolved, "mistral")


if __name__ == "__main__":
    unittest.main()
