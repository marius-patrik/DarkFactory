import subprocess
import os
import shutil
import pytest


def get_bun_path():
    bun_path = shutil.which("bun")
    if not bun_path:
        pytest.fail("bun not found in PATH")
    return bun_path


def test_get_base_branch_fallback():
    env = os.environ.copy()
    env.pop("DF_BASE_SHA", None)
    env.pop("GITHUB_BASE_REF", None)
    result = subprocess.run(
        [get_bun_path(), "scripts/get-base-branch.mjs"], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0
    assert result.stdout.strip() in ["origin/main", "main", "origin/develop", "develop", "HEAD~1"]


def test_get_base_branch_malicious_input():
    env = os.environ.copy()
    env["DF_BASE_SHA"] = "invalid-ref-$(whoami)"
    result = subprocess.run(
        [get_bun_path(), "scripts/get-base-branch.mjs"], env=env, capture_output=True, text=True
    )
    assert result.returncode == 0
    assert result.stdout.strip() in ["origin/main", "main", "origin/develop", "develop", "HEAD~1"]


@pytest.fixture
def temp_redaction_file(tmp_path):
    target_file = os.path.join("harness", "src", "redaction.ts")
    temp_dir = tmp_path / "redaction_backup"
    temp_dir.mkdir()
    temp_file = temp_dir / "redaction.ts"

    shutil.copy2(target_file, temp_file)

    try:
        yield target_file
    finally:
        shutil.copy2(temp_file, target_file)


def test_format_check_drift_integration(temp_redaction_file):
    # Apply formatting drift
    with open(temp_redaction_file, "a") as f:
        f.write("\n\nconst bad  =   123  ;\n")

    # Run the actual command (do not mock subprocess.run)
    result = subprocess.run(
        [get_bun_path(), "run", "format:check"],
        env={**os.environ, "DF_BASE_SHA": "HEAD~1"},  # Compare against HEAD~1
        capture_output=True,
        text=True,
        cwd="harness",
    )
    # biome should find the drift and return a non-zero exit code
    assert result.returncode != 0
    assert "Biome" in result.stderr or "Check failed" in result.stderr


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
        result = subprocess.run(
            [get_bun_path(), script_path], env=env, capture_output=True, text=True
        )
        assert result.returncode == 0
        assert "HEAD^" in result.stdout
