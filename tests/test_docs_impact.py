import os
import subprocess
import sys
import tempfile
import textwrap
import unittest

SCRIPT = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", ".github", "scripts", "docs_impact.py")
)


class TestDocsImpact(unittest.TestCase):
    def run_script(self, diff_lines, pr_body=""):
        with tempfile.NamedTemporaryFile("w+", delete=False) as tf:
            tf.write("\n".join(diff_lines))
            tf_path = tf.name
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    SCRIPT,
                    "--diff",
                    tf_path,
                    "--pr-body",
                    pr_body,
                ],
                capture_output=True,
                text=True,
            )
            return result.returncode, result.stdout, result.stderr
        finally:
            os.unlink(tf_path)

    def test_public_change_with_doc(self):
        # Changing harness src and README
        rc, out, err = self.run_script(
            [
                "harness/src/cli.ts",
                "README.md",
            ]
        )
        self.assertEqual(rc, 0)

    def test_public_change_without_doc(self):
        rc, out, err = self.run_script(
            [
                "harness/src/cli.ts",
            ]
        )
        self.assertEqual(rc, 1)
        self.assertIn("Public surface changes detected", out)

    def test_no_public_change(self):
        rc, out, err = self.run_script(
            [
                "README.md",
                ".agents/notes/some.md",
            ]
        )
        self.assertEqual(rc, 0)

    def test_bypass(self):
        rc, out, err = self.run_script(
            [
                "harness/src/cli.ts",
            ],
            pr_body="Docs: none (documentation not required)",
        )
        self.assertEqual(rc, 0)


if __name__ == "__main__":
    unittest.main()
