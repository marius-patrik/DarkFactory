# Checks that exercise the derivation rather than restate it.
#
# Each one fails for a reason that would otherwise only show up as a failed agent
# run: a `df` that cannot start, or a closure that carries an interpreter.
#
# Deliberately absent: a check that runs the harness's `tsc --noEmit`. That
# command reports 29 errors on origin/develop, so wiring it up here would add a
# check that is red before it says anything about this flake, and turning it
# green would mean changing harness type errors -- which is not this change's
# subject. It is a real gap in what a check covers, and it belongs with whoever
# fixes the 29.
{ lib
, runCommand
, nix
, agentEnv
}:

let
  inherit (agentEnv) tools;
in
{
  # The image's central claim: a Bun from the closure plus the source tree is
  # enough to run df. There is no compile step, so this is the whole of it.
  df-runs = runCommand "check-df-runs" { } ''
    ${agentEnv}/bin/df --help > /dev/null
    echo "df starts from the derived environment"
    touch $out
  '';

  # Every executable the agent can reach, on the PATH its entrypoint hands to its
  # children. A derivation that installed the right packages but wired up no PATH
  # would pass the package list and fail on the first secret-tool call, so this
  # asks the question the runtime will actually ask.
  tools-on-path = runCommand "check-tools-on-path" { } ''
    for tool in git secret-tool dbus-run-session gnome-keyring-daemon bash; do
      path=$(PATH=${lib.makeBinPath tools} command -v "$tool")
      test -n "$path" || { echo "not on PATH: $tool" >&2; exit 1; }
      echo "  $tool -> $path"
    done
    echo "every tool the repository calls is resolvable"
    touch $out
  '';

  # #1202's exit criterion, stated as a check rather than a promise: nothing in the
  # image's closure may be a Python interpreter. The old image was
  # FROM python:3.12-slim-bookworm for one line of ENTRYPOINT, and this is what
  # stops that creeping back in through a dependency.
  no-python = runCommand "check-no-python"
    {
      nativeBuildInputs = [ nix ];
    }
    ''
      offenders=0
      for path in $(nix-store --query --requisites ${agentEnv}); do
        for interpreter in python python2 python3 pypy pypy3; do
          if [ -e "$path/bin/$interpreter" ]; then
            echo "closure member provides a Python interpreter: $path/bin/$interpreter" >&2
            offenders=1
          fi
        done
      done
      test "$offenders" -eq 0
      echo "no Python interpreter in the agent closure"
      touch $out
    '';
}
