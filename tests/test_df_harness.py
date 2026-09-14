"""Unit tests for running the pipeline's agent work through df.

Covers the three df boundaries in the runner: parsing the ``df run --json`` event stream into
the final answer text, mapping df's exit codes onto the quota/error paths, and configuring df's
accounts from the environment before dispatch (mocked subprocess throughout; no real df needed).
"""

import json
import os
import stat
import subprocess
import sys

import pytest

import agent_runner
import harnesses


@pytest.fixture(autouse=True)
def _df_environment(monkeypatch: pytest.MonkeyPatch, tmp_path):
    """Points the df chain at a fake binary and isolates HOME and DF_HOME.

    Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
    """
    monkeypatch.setenv("AGENT_HARNESS_CHAIN", "df")
    monkeypatch.delenv("AGENT_HARNESS_CONFIG", raising=False)
    monkeypatch.setattr(harnesses.shutil, "which", lambda binary: f"/usr/bin/{binary}")
    monkeypatch.setenv("HOME", str(tmp_path))
    monkeypatch.delenv("DF_HOME", raising=False)
    for name in agent_runner.df_setup_secret_names():
        monkeypatch.delenv(name, raising=False)


def _stream(*events) -> str:
    """Renders df JSON event lines.

    Args:
        events: Event objects, one per line.

    Returns:
        The stdout text.
    """
    return "".join(json.dumps(event) + "\n" for event in events)


class TestDfJsonOutput:
    """The answer is the assistant text streamed after the last tool call."""

    def test_text_after_the_last_tool_call_is_the_answer(self):
        """Narration before the tools is superseded by what follows them."""
        stdout = _stream(
            {"type": "session", "sessionId": "s1"},
            {"type": "text_delta", "delta": "early narration "},
            {"type": "tool_start", "toolCallId": "t1", "toolName": "read", "input": {}},
            {"type": "tool_end", "toolCallId": "t1", "toolName": "read", "isError": False},
            {"type": "text_delta", "delta": "final answer"},
            {"type": "result", "stopReason": "end_turn"},
        )
        assert agent_runner.parse_df_json_output(stdout) == "final answer"

    def test_text_between_tool_calls_is_superseded_too(self):
        """Only the segment after the final tool activity survives."""
        stdout = _stream(
            {"type": "text_delta", "delta": "first"},
            {"type": "tool_end", "toolCallId": "t1", "toolName": "bash", "isError": False},
            {"type": "text_delta", "delta": "second"},
            {"type": "tool_end", "toolCallId": "t2", "toolName": "edit", "isError": False},
            {"type": "text_delta", "delta": "third"},
        )
        assert agent_runner.parse_df_json_output(stdout) == "third"

    def test_a_run_without_tools_answers_with_the_whole_stream(self):
        """No tool activity means no segment is discarded."""
        stdout = _stream(
            {"type": "text_delta", "delta": "hello "},
            {"type": "text_delta", "delta": "world"},
            {"type": "result", "stopReason": "end_turn"},
        )
        assert agent_runner.parse_df_json_output(stdout) == "hello world"

    def test_non_json_lines_are_ignored(self):
        """A stray warning line must not break the parse."""
        stdout = "bun: some notice\n" + _stream({"type": "text_delta", "delta": "kept"})
        assert agent_runner.parse_df_json_output(stdout) == "kept"

    def test_an_empty_stream_is_empty(self):
        """No deltas means no answer, which the runner treats as a failed attempt."""
        assert agent_runner.parse_df_json_output("") == ""
        assert agent_runner.parse_df_json_output(_stream({"type": "result"})) == ""


class TestDfExitMapping:
    """df's exit codes (see ``exitCodeFor`` in its ``src/cli.ts``) drive the runner's paths."""

    def test_exit_2_is_quota_exhausted_everywhere(self, monkeypatch):
        """Exit 2 checkpoints and returns the exhaustion notice, like any spent chain."""
        monkeypatch.setattr(
            agent_runner.subprocess,
            "run",
            lambda *a, **k: (_ for _ in ()).throw(
                subprocess.CalledProcessError(2, a[0], stderr="")
            ),
        )
        result = agent_runner.run_agent_prompt("do it", max_retries=0)
        assert result.startswith(agent_runner.QUOTA_EXHAUSTED_NOTICE)

    def test_exit_1_is_a_plain_error(self, monkeypatch):
        """A genuine failure returns at once instead of burning retries on a spent budget."""
        calls = []

        def fail(argv, **kwargs):
            calls.append(1)
            raise subprocess.CalledProcessError(1, argv, stderr="boom")

        monkeypatch.setattr(agent_runner.subprocess, "run", fail)
        result = agent_runner.run_agent_prompt("do it", max_retries=0)
        assert "[DarkFactory Agent Execution Error]" in result
        assert "boom" in result
        assert len(calls) == 1

    def test_exit_3_is_an_authentication_error(self, monkeypatch):
        """Exit 3 names the failure for what it is instead of checkpointing for quota."""
        monkeypatch.setattr(
            agent_runner.subprocess,
            "run",
            lambda *a, **k: (_ for _ in ()).throw(
                subprocess.CalledProcessError(3, a[0], stderr="")
            ),
        )
        result = agent_runner.run_agent_prompt("do it", max_retries=0)
        assert "[DarkFactory Agent Execution Error]" in result
        assert "authentication failed" in result
        assert not result.startswith(agent_runner.QUOTA_EXHAUSTED_NOTICE)

    def test_the_error_event_message_is_surfaced(self, monkeypatch):
        """df's own ``type: error`` summary is the most precise failure text available."""
        stdout = _stream(
            {
                "type": "error",
                "message": "openai-codex/gpt-5.6-luna@default: auth failed",
                "exitCode": 1,
            }
        )

        def fail(argv, **kwargs):
            raise subprocess.CalledProcessError(1, argv, stderr="x", output=stdout)

        monkeypatch.setattr(agent_runner.subprocess, "run", fail)
        result = agent_runner.run_agent_prompt("do it", max_retries=0)
        assert "openai-codex/gpt-5.6-luna@default: auth failed" in result


class TestDfPromptFile:
    """The prompt travels by file, and the file never outlives the attempt."""

    def test_the_prompt_reaches_df_through_a_file(self, monkeypatch, tmp_path):
        """The argv names ``--prompt-file`` and the file holds the prompt and the answer contract."""
        seen = {}

        def fake_run(argv, **kwargs):
            assert argv[:3] == ["df", "run", "--json"]
            assert argv[3] == "--prompt-file"
            with open(argv[4], encoding="utf-8") as handle:
                seen["prompt"] = handle.read()
            seen["path"] = argv[4]
            return subprocess.CompletedProcess(
                argv, 0, stdout=_stream({"type": "text_delta", "delta": "done"}), stderr=""
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("the exact prompt") == "done"
        assert seen["prompt"] == "the exact prompt" + agent_runner.ANSWER_CONTRACT
        assert not os.path.exists(seen["path"]), "the prompt file must be removed"

    def test_a_json_answer_after_tools_is_returned(self, monkeypatch):
        """End to end: event stream in, final text out."""

        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(
                argv,
                0,
                stdout=_stream(
                    {"type": "text_delta", "delta": "thinking aloud"},
                    {
                        "type": "tool_start",
                        "toolCallId": "t",
                        "toolName": "bash",
                        "input": {},
                    },
                    {
                        "type": "tool_end",
                        "toolCallId": "t",
                        "toolName": "bash",
                        "isError": False,
                    },
                    {"type": "text_delta", "delta": "implemented"},
                ),
                stderr="",
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("implement it") == "implemented"


class TestDfSetup:
    """Each populated variable maps onto one `df account` call; empty ones are skipped."""

    def _record(self, monkeypatch):
        """Records setup subprocess calls as ``(argv, stdin, env DF_HOME)``.

        Args:
            monkeypatch: Pytest monkeypatch fixture.

        Returns:
            The recorded calls.
        """
        calls = []

        def fake_run(argv, **kwargs):
            calls.append((list(argv), kwargs.get("input"), kwargs.get("env", {}).get("DF_HOME")))
            return subprocess.CompletedProcess(argv, 0, stdout="ok", stderr="")

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        return calls

    def test_api_keys_map_to_df_account_set(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("GEMINI_API_KEY", "gem-key")
        monkeypatch.setenv("OPENROUTER_API_KEY_2", "or-key")
        calls = self._record(monkeypatch)
        df_home = agent_runner.setup_df_accounts()
        account_calls = [call for call in calls if call[0][:3] == ["df", "account", "set"]]
        assert (
            ["df", "account", "set", "google:default", "api_key", "--type", "api_key"],
            "gem-key",
            df_home,
        ) in account_calls
        assert (
            ["df", "account", "set", "openrouter:acct2", "api_key", "--type", "api_key"],
            "or-key",
            df_home,
        ) in account_calls
        assert os.path.isdir(df_home)

    def test_empty_variables_are_skipped(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        calls = self._record(monkeypatch)
        agent_runner.setup_df_accounts()
        assert [call for call in calls if call[0][:3] == ["df", "account", "set"]] == []
        assert [call for call in calls if call[0][:3] == ["df", "account", "import"]] == []

    def test_groq_and_remaining_keys_map_to_their_accounts(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("GEMINI_API_KEY_2", "k2")
        monkeypatch.setenv("GEMINI_API_KEY_3", "k3")
        monkeypatch.setenv("OPENROUTER_API_KEY", "or1")
        monkeypatch.setenv("GROQ_API_KEY", "grok-key")
        calls = self._record(monkeypatch)
        agent_runner.setup_df_accounts()
        accounts = [call[0][3] for call in calls if call[0][:3] == ["df", "account", "set"]]
        assert accounts == [
            "google:key2",
            "google:key3",
            "openrouter:default",
            "groq:default",
        ]

    def test_a_login_file_is_written_0600_then_imported(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        monkeypatch.setenv("CODEX_AUTH_JSON", '{"auth": "codex-login"}')
        calls = self._record(monkeypatch)
        agent_runner.setup_df_accounts()
        path = tmp_path / ".codex" / "auth.json"
        assert path.read_text(encoding="utf-8") == '{"auth": "codex-login"}'
        if sys.platform != "win32":
            assert stat.S_IMODE(os.stat(path).st_mode) == 0o600
        assert [
            "df",
            "account",
            "import",
            "codex",
            "--account",
            "default",
        ] in [call[0] for call in calls]

    def test_a_grok_login_is_imported_as_grok(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        monkeypatch.setenv("GROK_AUTH_JSON", '{"auth": "grok-login"}')
        calls = self._record(monkeypatch)
        agent_runner.setup_df_accounts()
        assert (tmp_path / ".grok" / "auth.json").read_text(encoding="utf-8") == (
            '{"auth": "grok-login"}'
        )
        assert [
            "df",
            "account",
            "import",
            "grok",
            "--account",
            "default",
        ] in [call[0] for call in calls]

    def test_the_target_repo_config_is_copied_into_df_home(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        config_dir = tmp_path / ".darkfactory" / "df"
        config_dir.mkdir(parents=True)
        (config_dir / "config.json").write_text('{"defaultChain": "x"}', encoding="utf-8")
        monkeypatch.setattr(agent_runner, "WORKSPACE_DIR", str(tmp_path))
        self._record(monkeypatch)
        df_home = agent_runner.setup_df_accounts()
        copied = os.path.join(df_home, "config.json")
        assert os.path.isfile(copied)
        with open(copied, encoding="utf-8") as handle:
            assert json.load(handle) == {"defaultChain": "x"}

    def test_the_pipeline_config_is_the_fallback(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        fallback = tmp_path / ".darkfactory-pipeline" / ".darkfactory" / "df"
        fallback.mkdir(parents=True)
        (fallback / "config.json").write_text('{"defaultChain": "y"}', encoding="utf-8")
        monkeypatch.setattr(agent_runner, "WORKSPACE_DIR", str(tmp_path))
        assert agent_runner.find_df_config() == str(fallback / "config.json")

    def test_a_missing_df_binary_is_a_notice_not_a_failure(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setenv("GEMINI_API_KEY", "gem-key")

        def missing(argv, **kwargs):
            raise FileNotFoundError("no df here")

        monkeypatch.setattr(agent_runner.subprocess, "run", missing)
        assert os.path.isdir(agent_runner.setup_df_accounts())


class TestDfLoginRotation:
    """A rotated borrowed login is written back under that account's own secret name."""

    def test_a_rotated_codex_login_is_written_back(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        path = tmp_path / ".codex" / "auth.json"
        path.parent.mkdir(parents=True)
        path.write_text('{"auth": "v1"}', encoding="utf-8")
        states = agent_runner.snapshot_df_login_files()
        path.write_text('{"auth": "v2"}', encoding="utf-8")

        persisted = []
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda secret, value: persisted.append((secret, value)) or True,
        )
        agent_runner.finish_df_login_files(states)
        assert persisted == [("CODEX_AUTH_JSON", '{"auth": "v2"}')]

    def test_an_unchanged_login_is_not_written_back(self, monkeypatch, tmp_path):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        tmp_path: Pytest-provided empty directory.
        """
        path = tmp_path / ".codex" / "auth.json"
        path.parent.mkdir(parents=True)
        path.write_text('{"auth": "same"}', encoding="utf-8")
        states = agent_runner.snapshot_df_login_files()
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda *a: pytest.fail("must not write an unchanged login"),
        )
        agent_runner.finish_df_login_files(states)

    def test_a_run_persists_rotation_and_keeps_the_file(self, monkeypatch, tmp_path):
        """The setup-written login stays for df to import; only the secret is updated."""
        login_path = tmp_path / ".codex" / "auth.json"
        login_path.parent.mkdir(parents=True)
        login_path.write_text('{"auth": "v1"}', encoding="utf-8")
        persisted = []

        def fake_run(argv, **kwargs):
            login_path.write_text('{"auth": "v2"}', encoding="utf-8")
            return subprocess.CompletedProcess(
                argv, 0, stdout=_stream({"type": "text_delta", "delta": "ok"}), stderr=""
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda secret, value: persisted.append((secret, value)) or True,
        )
        assert agent_runner.run_agent_prompt("do it") == "ok"
        assert persisted == [("CODEX_AUTH_JSON", '{"auth": "v2"}')]
        assert login_path.exists(), "the borrowed login file stays in place for df"

    def test_a_run_without_logins_persists_nothing(self, monkeypatch):
        """Args:
        monkeypatch: Pytest monkeypatch fixture.
        """
        monkeypatch.setattr(
            agent_runner,
            "persist_rotated_token",
            lambda *a: pytest.fail("must not write when nothing rotated"),
        )

        def fake_run(argv, **kwargs):
            return subprocess.CompletedProcess(
                argv, 0, stdout=_stream({"type": "text_delta", "delta": "ok"}), stderr=""
            )

        monkeypatch.setattr(agent_runner.subprocess, "run", fake_run)
        assert agent_runner.run_agent_prompt("do it") == "ok"
