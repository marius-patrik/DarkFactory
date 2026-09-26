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
    # Work on a copy in a temp directory
    temp_dir = tmp_path / "work"
    temp_dir.mkdir()
    working_file = temp_dir / "redaction.ts"
    shutil.copy2(target_file, working_file)

    yield working_file
    # No cleanup needed as tmp_path is managed by pytest


def test_format_check_drift_integration(temp_redaction_file):
    # Apply formatting drift to the copy
    with open(temp_redaction_file, "a") as f:
        f.write("\n\nconst bad  =   123  ;\n")

    # Run the command, overriding the target file location via a mock or by passing env var if supported,
    # but since format:check runs on the repo, we simulate the drift check logic
    # instead of full integration if we can't easily override the path.
    # For this test, we verify the logic works by checking against the file.

    # Actually, we can't easily point biome to a different file while checking the whole project.
    # The existing test structure implies we are checking drift in the real directory.
    # Let's keep the original logic but make it robust by copying the whole harness/src
    # to a temp directory and running the check there.

    import tempfile

    with tempfile.TemporaryDirectory() as tmp_dir:
        # Initialize a git repository to satisfy git command requirements
        subprocess.run(["git", "init"], cwd=tmp_dir, check=True)
        subprocess.run(["git", "config", "user.email", "test@example.com"], cwd=tmp_dir, check=True)
        subprocess.run(["git", "config", "user.name", "Test User"], cwd=tmp_dir, check=True)

        # Clone relevant dirs
        shutil.copytree("harness", os.path.join(tmp_dir, "harness"))

        # Create a commit
        subprocess.run(["git", "add", "."], cwd=tmp_dir, check=True)
        subprocess.run(["git", "commit", "-m", "initial commit"], cwd=tmp_dir, check=True)

        # Apply drift
        with open(os.path.join(tmp_dir, "harness", "src", "redaction.ts"), "a") as f:
            f.write("\n\nconst bad  =   123  ;\n")

        # Run check
        result = subprocess.run(
            [get_bun_path(), "x", "biome", "ci", "harness/src"],
            capture_output=True,
            text=True,
            cwd=tmp_dir,
        )
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
