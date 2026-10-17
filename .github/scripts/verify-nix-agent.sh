#!/usr/bin/env bash
# Producer-only runtime proof. Called by ci.yml for each native Linux architecture.
# Its success is required by the protected aggregate "quality" job.
set -euo pipefail

nix flake lock
git ls-files --error-unmatch flake.lock
git diff --exit-code -- flake.lock
nix flake check -L --show-trace
nix build .#agentImage -L --show-trace
docker load -i result
docker image inspect darkfactory-agent:nix > /dev/null

docker run --rm darkfactory-agent:nix --help
docker run --rm darkfactory-agent:nix --version
docker run --rm darkfactory-agent:nix providers
docker run --rm darkfactory-agent:nix __packaging-smoke

workspace="$(mktemp -d "${RUNNER_TEMP:-/tmp}/df-agent-verify.XXXXXXXX")"
trap 'rm -rf "$workspace"' EXIT

docker run --rm --entrypoint /bin/sh -v "$workspace:/workspace" darkfactory-agent:nix -ec '
  test "$(id -u)" = 1001
  test "$(id -g)" = 1001
  touch /workspace/write-probe
  git init -q /workspace/fixture
  git -C /workspace/fixture status --short
  command -v df
  # A compiled native executable, not a shell script invoking Bun source.
  test "$(od -An -tx1 -N4 "$(command -v df)" | tr -d " \\n")" = "7f454c46"
  df --version | grep "^df "
  command -v gh
  command -v secret-tool
  command -v dbus-run-session
'
test -f "$workspace/write-probe"

cp .github/scripts/agent-dispatch-preload.ts "$workspace/dispatch-preload.ts"
# Do not select a real/free service by policy during a test. Pin the genuine in-memory
# model implementation in the normal providers configuration. It must emit text through
# df run --json; the dispatch's interpretation must carry that actual response text.
printf '%s' '{"providers":{"defaultChain":"faux/echo@test","router":{"policies":[{"id":"fixture-only","match":{},"prefer":{"candidates":["faux/echo@test"],"includeCatalogue":false}}],"candidates":["faux/echo@test"]}}}' > "$workspace/repo.dfconfig"
printf '%s' '{"action":"opened","issue":{"number":77,"labels":[]},"repository":{"full_name":"marius-patrik/DarkFactory"}}' > "$workspace/event.json"

docker run --rm \
  -v "$workspace:/workspace" \
  -e BUN_OPTIONS="--preload=/workspace/dispatch-preload.ts" \
  -e DF_FAUX=1 \
  -e DF_OFFLINE=1 \
  -e GH_TOKEN=ci-fixture-token \
  -e GITHUB_REPOSITORY=marius-patrik/DarkFactory \
  -e GITHUB_EVENT_NAME=issues \
  -e GITHUB_EVENT_PATH=/workspace/event.json \
  darkfactory-agent:nix dispatch

test -f "$workspace/dispatch-observed.ndjson"
grep -q '"kind":"model-runtime"' "$workspace/dispatch-observed.ndjson"
grep -q '"method":"GET","path":"/repos/marius-patrik/DarkFactory/issues/77"' "$workspace/dispatch-observed.ndjson"
grep -q '"method":"POST","path":"/repos/marius-patrik/DarkFactory/issues/77/comments"' "$workspace/dispatch-observed.ndjson"
grep -q 'DarkFactory Agent Interpretation' "$workspace/dispatch-observed.ndjson"
grep -q 'faux: Analyze this user request issue' "$workspace/dispatch-observed.ndjson"
# An isolated run may never make an unmocked network call. The fixture throws for any
# non-GitHub request and rejects unexpected GitHub endpoints.

printf '%s' '{invalid json' > "$workspace/event.json"
if docker run --rm \
    -v "$workspace:/workspace" \
    -e GH_TOKEN=ci-fixture-token \
    -e GITHUB_REPOSITORY=marius-patrik/DarkFactory \
    -e GITHUB_EVENT_NAME=issues \
    -e GITHUB_EVENT_PATH=/workspace/event.json \
    darkfactory-agent:nix dispatch; then
  echo "::error::Malformed event was accepted." >&2
  exit 1
fi
