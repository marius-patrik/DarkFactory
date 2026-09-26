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
            f.write(original + "\n\nconst   badFormatting   =   123  ;\n")

        subprocess.run(["git", "add", target_file], check=True)

        env = os.environ.copy()
        env["DF_BASE_SHA"] = "HEAD~1"

        result = subprocess.run(
            "bun run format:check", shell=True, capture_output=True, text=True, env=env
        )
        assert result.returncode != 0

    finally:
        with open(target_file, "w") as f:
            f.write(original)
        subprocess.run(["git", "checkout", target_file], capture_output=True)


def test_get_base_branch_with_config():
    import json

    with open("repo.dfconfig", "r") as f:
        config_content = f.read()

    try:
        dummy_config = {
            "repo": {
                "identity": {"default_branch": "custom-default", "development_branch": "custom-dev"}
            }
        }
        with open("repo.dfconfig", "w") as f:
            json.dump(dummy_config, f)

        env = os.environ.copy()
        env.pop("DF_BASE_SHA", None)
        env.pop("GITHUB_BASE_REF", None)

        result = subprocess.run(
            ["bun", "scripts/get-base-branch.mjs"], env=env, capture_output=True, text=True
        )
        assert result.returncode == 0

    finally:
        with open("repo.dfconfig", "w") as f:
            f.write(config_content)
