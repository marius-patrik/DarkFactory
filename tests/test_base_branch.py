import subprocess
import os
import pytest


def test_get_base_branch_fallback():
    env = os.environ.copy()
    env.pop("DF_BASE_SHA", None)
    env.pop("GITHUB_BASE_REF", None)
    result = subprocess.run(
        ["bun", "scripts/get-base-branch.mjs"], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0
    assert result.stdout.strip() in ["origin/main", "main", "origin/develop", "develop", "HEAD~1"]


def test_get_base_branch_malicious_input():
    env = os.environ.copy()
    env["DF_BASE_SHA"] = "invalid-ref-$(whoami)"
    result = subprocess.run(
        ["bun", "scripts/get-base-branch.mjs"], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0
    assert result.stdout.strip() in ["origin/main", "main", "origin/develop", "develop", "HEAD~1"]


def test_format_check_drift_integration():
    target_file = os.path.join("harness", "src", "redaction.ts")
    with open(target_file, "r") as f:
        original = f.read()

    try:
        with open(target_file, "w") as f:
            f.write(original + "\n\nconst bad  =   123  ;\n")

        result = subprocess.run(
            ["bun", "run", "format:check"],
            env={**os.environ, "DF_BASE_SHA": "HEAD^^"},
            capture_output=True,
            text=True,
            shell=False,
        )
        assert result.returncode != 0

    finally:
        with open(target_file, "w") as f:
            f.write(original)


def test_get_base_branch_with_config():
    import json
    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        dummy_config = {
            "repo": {"identity": {"default_branch": "HEAD^", "development_branch": "HEAD^"}}
        }
        with open(os.path.join(tmp_dir, "repo.dfconfig"), "w") as f:
            json.dump(dummy_config, f)

        env = os.environ.copy()
        env.pop("DF_BASE_SHA", None)
        env.pop("GITHUB_BASE_REF", None)
        env["DF_CONFIG_PATH"] = os.path.join(tmp_dir, "repo.dfconfig")

        script_path = os.path.abspath("scripts/get-base-branch.mjs")
        result = subprocess.run(["bun", script_path], env=env, capture_output=True, text=True)
        assert result.returncode == 0
        assert "HEAD^" in result.stdout
