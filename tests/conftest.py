"""Shared test isolation fixtures."""

import pytest


@pytest.fixture(autouse=True)
def isolate_pipeline_environment(monkeypatch):
    """Prevent inherited pipeline credentials and GitHub context leaking into tests."""
    for name in (
        "GH_TOKEN",
        "GH_PROJECT_TOKEN",
        "GITHUB_TOKEN",
        "PROJECT_NUMBER",
        "PROJECT_OWNER",
        "GITHUB_EVENT_NAME",
        "GITHUB_EVENT_PATH",
    ):
        monkeypatch.delenv(name, raising=False)


@pytest.fixture(autouse=True)
def block_network(monkeypatch):
    """Tests never reach GitHub or any provider; unauthenticated calls to public repos would succeed in CI."""
    import urllib.request

    def refuse(*_args, **_kwargs):
        raise OSError("network access is disabled in tests")

    monkeypatch.setattr(urllib.request, "urlopen", refuse)
