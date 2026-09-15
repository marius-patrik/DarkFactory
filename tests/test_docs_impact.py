"""Tests for the docs-impact check script."""

import os
import subprocess
import sys
import tempfile
from pathlib import Path

import pytest

SCRIPT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", ".github", "scripts", "docs_impact.py")
)


def run_script(
    diff_path=None,
    base=None,
    body_file=None,
    pr_body="",
    cwd=None,
    extra_env=None,
):
    """Run the docs_impact script and return (rc, stdout, stderr)."""
    cmd = [sys.executable, SCRIPT]
    if diff_path:
        cmd.extend(["--diff", diff_path])
    if base:
        cmd.extend(["--base", base])
    if body_file:
        cmd.extend(["--body-file", body_file])
    if pr_body:
        cmd.extend(["--pr-body", pr_body])
    env = {**os.environ, "PYTHONPATH": os.path.dirname(SCRIPT)}
    if extra_env:
        env.update(extra_env)
    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        cwd=cwd,
        env=env,
    )
    return result.returncode, result.stdout, result.stderr


@pytest.fixture
def git_repo(tmp_path):
    """Create a temporary git repo with an initial commit on main."""
    subprocess.run(
        ["git", "init", "-b", "main"],
        cwd=tmp_path,
        check=True,
        capture_output=True,
    )
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=t",
            "-c",
            "user.email=t@users.noreply.example",
            "commit",
            "--allow-empty",
            "-m",
            "init",
        ],
        cwd=tmp_path,
        check=True,
        capture_output=True,
    )
    return tmp_path


class TestDocsImpactDiffFile:
    """Tests using the --diff file path (no git required)."""

    def test_public_change_with_doc(self):
        """Changing harness src and README passes."""
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("harness/src/cli.ts\nREADME.md\n")
            tf_path = tf.name
        try:
            rc, out, err = run_script(diff_path=tf_path)
            assert rc == 0
        finally:
            os.unlink(tf_path)

    def test_public_change_without_doc(self):
        """Changing harness src without docs fails."""
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("harness/src/cli.ts\n")
            tf_path = tf.name
        try:
            rc, out, err = run_script(diff_path=tf_path)
            assert rc == 1
            assert "Public surface changes detected" in out
        finally:
            os.unlink(tf_path)

    def test_no_public_change(self):
        """Only doc changes pass."""
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("README.md\n.agents/notes/some.md\n")
            tf_path = tf.name
        try:
            rc, out, err = run_script(diff_path=tf_path)
            assert rc == 0
        finally:
            os.unlink(tf_path)

    def test_bypass(self):
        """Docs: none (reason) bypass passes."""
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("harness/src/cli.ts\n")
            tf_path = tf.name
        try:
            rc, out, err = run_script(
                diff_path=tf_path, pr_body="Docs: none (documentation not required)"
            )
            assert rc == 0
        finally:
            os.unlink(tf_path)


class TestDocsImpactGitRepo:
    """Tests using a real git repository under tmp_path."""

    def test_public_change_without_docs_fails(self, git_repo):
        """A change to harness/src/x.ts without docs fails (exit 1) and lists the file."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        rc, out, err = run_script(base="main", cwd=git_repo)
        assert rc == 1
        assert "harness/src/x.ts" in out

    def test_public_change_with_doc_passes(self, git_repo):
        """The same change plus README.md passes."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        (git_repo / "README.md").write_text("updated\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts", "README.md"],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        rc, out, err = run_script(base="main", cwd=git_repo)
        assert rc == 0

    def test_bypass_with_reason_passes(self, git_repo):
        """A body file containing Docs: none (internal refactor) passes."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        body_file = git_repo / "body.txt"
        body_file.write_text("Docs: none (internal refactor)\n")

        rc, out, err = run_script(base="main", body_file=str(body_file), cwd=git_repo)
        assert rc == 0

    def test_bypass_empty_reason_does_not_bypass(self, git_repo):
        """Docs: none () does not bypass."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        body_file = git_repo / "body.txt"
        body_file.write_text("Docs: none ()\n")

        rc, out, err = run_script(base="main", body_file=str(body_file), cwd=git_repo)
        assert rc == 1

    def test_missing_base_returns_2(self, git_repo):
        """A missing base returns 2."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        rc, out, err = run_script(base="nonexistent-branch", cwd=git_repo)
        assert rc == 2

    def test_unknown_base_ref_returns_2(self, git_repo):
        """An unknown base ref returns 2."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        rc, out, err = run_script(base="unknown/ref", cwd=git_repo)
        assert rc == 2

    def test_no_base_returns_2(self, git_repo):
        """No --base and no env returns 2."""
        subprocess.run(
            ["git", "checkout", "-b", "feature"], cwd=git_repo, check=True, capture_output=True
        )
        (git_repo / "harness" / "src").mkdir(parents=True, exist_ok=True)
        (git_repo / "harness" / "src" / "x.ts").write_text("export const x = 1;\n")
        subprocess.run(
            ["git", "add", "harness/src/x.ts"], cwd=git_repo, check=True, capture_output=True
        )
        subprocess.run(
            [
                "git",
                "-c",
                "user.name=t",
                "-c",
                "user.email=t@users.noreply.example",
                "commit",
                "-m",
                "feat",
            ],
            cwd=git_repo,
            check=True,
            capture_output=True,
        )

        rc, out, err = run_script(cwd=git_repo)
        assert rc == 2
