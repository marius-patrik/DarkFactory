import os
import sys
import subprocess
import pytest

# Ensure the .github/scripts directory is on sys.path for import
SCRIPT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".github", "scripts"))
sys.path.insert(0, SCRIPT_DIR)

import darkfactory_paths


def _run_harness_resolve(repo_root: str, name: str) -> str:
    """Run the TypeScript resolveRepoFile via bun and return its output path."""
    # Use bun to execute a short script that imports the TS module and prints the result.
    code = (
        "import { resolveRepoFile } from './harness/src/storage/resolve-repo-file.ts';"
        "console.log(resolveRepoFile('" + name + "', process.argv[1]));"
    )
    result = subprocess.run(
        ["bun", "-e", code, repo_root],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(f"bun failed: {result.stderr}")
    return result.stdout.strip()


def test_precedence_primary_exists(tmp_path):
    # Only .darkfactory/name exists
    primary = tmp_path / ".darkfactory" / "repo.df"
    primary.parent.mkdir(parents=True, exist_ok=True)
    primary.touch()
    path = darkfactory_paths.repo_file("repo.df", str(tmp_path))
    assert path == os.path.abspath(str(primary))


def test_precedence_fallback_exists(tmp_path):
    # Only root name exists
    fallback = tmp_path / "repo.df"
    fallback.touch()
    path = darkfactory_paths.repo_file("repo.df", str(tmp_path))
    assert path == os.path.abspath(str(fallback))


def test_both_present_error(tmp_path):
    primary = tmp_path / ".darkfactory" / "repo.df"
    primary.parent.mkdir(parents=True, exist_ok=True)
    primary.touch()
    fallback = tmp_path / "repo.df"
    fallback.touch()
    with pytest.raises(FileExistsError) as exc:
        darkfactory_paths.repo_file("repo.df", str(tmp_path))
    msg = str(exc.value)
    assert str(primary.resolve()) in msg
    assert str(fallback.resolve()) in msg


def test_legacy_paths_error(tmp_path):
    for legacy in [
        ".darkfactory/manifest.json",
        ".darkfactory/df/config.json",
        ".github/darkfactory.json",
    ]:
        legacy_path = tmp_path / legacy
        legacy_path.parent.mkdir(parents=True, exist_ok=True)
        legacy_path.touch()
        with pytest.raises(FileNotFoundError) as exc:
            darkfactory_paths.repo_file("repo.df", str(tmp_path))
        msg = str(exc.value)
        # The error should mention the new location (primary)
        assert os.path.join(".darkfactory", "repo.df") in msg
        # Clean up for next iteration
        legacy_path.unlink()
        # Remove empty dirs if any
        try:
            legacy_path.parent.rmdir()
        except OSError:
            pass


def test_pipeline_and_harness_agree(tmp_path):
    # Create repo.df in .darkfactory
    primary = tmp_path / ".darkfactory" / "repo.df"
    primary.parent.mkdir(parents=True, exist_ok=True)
    primary.touch()
    py_path = darkfactory_paths.repo_file("repo.df", str(tmp_path))
    # Resolve via harness TS function
    ts_path = _run_harness_resolve(str(tmp_path), "repo.df")
    assert os.path.abspath(py_path) == os.path.abspath(ts_path)
