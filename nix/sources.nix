# Which files the agent image carries, and which files decide its dependency closure.
#
# Two filters, for two different jobs:
#
#   agentSource    - the runtime tree copied into the image. `df` executes in
#                    place, so this is the harness plus every workspace it
#                    imports, and nothing that describes how the image is built.
#   manifestSource - every package.json, plus the root bun.lock, and nothing else.
#                    node_modules is a function of these alone, so this is the
#                    input to the dependency derivation (see bun-deps.nix).
#
# Excluding the Python suite is not cosmetic. #1202's exit criterion is zero
# Python, and the only reason the image was `FROM python:3.12-slim-bookworm` was
# an entrypoint that execed an interpreter. An interpreter-free image that
# shipped .py files would be carrying weight nothing can lift.
{ lib, repoRoot }:

let
  nameOf = path: baseNameOf (toString path);

  relativeTo = path: lib.removePrefix "${toString repoRoot}/" (toString path);

  # Never carried, in any role: install output, VCS metadata, Python bytecode,
  # and the 466 KiB publication PDF (PAPER.pdf, 477159 bytes on origin/develop).
  alwaysExcluded = name:
    name == "node_modules"
    || name == ".git"
    || name == "__pycache__"
    || lib.hasSuffix ".pyc" name
    || lib.hasSuffix ".pdf" name;

  # Carried as repository data rather than as image runtime. The Python test
  # suite and its manifests; the pipeline's own .github directory; and the files
  # that define this image, which describe it rather than run in it.
  #
  # The .github exclusion is safe because nothing in the runtime reads it from
  # this checkout. Every `.github` reference under harness/src is either resolved
  # against a repository the agent is operating on -- harness/src/ci/installer.ts
  # joins it onto a `repoDir` argument that defaults to process.cwd(), and
  # harness/src/graph/planning.ts matches it as a path inside the subject
  # repository -- or is a template string for a workflow that runs on the Actions
  # runner. The templates themselves are not in .github: they are
  # harness/assets/workflows/*.tmpl, which this image does carry.
  repositoryOnly = rel:
    lib.elem rel [ "flake.nix" "pyproject.toml" "requirements-dev.txt" ]
    || lib.hasPrefix "tests/" rel
    || lib.hasPrefix ".github/" rel
    || lib.hasPrefix "docker/" rel
    || lib.hasPrefix "nix/" rel;

  # cleanSourceWith never calls the filter on the root itself, so `relativeTo`
  # always strips a real prefix here.
  filterFor = keep: path: type:
    let
      rel = relativeTo path;
    in
    !alwaysExcluded (nameOf path)
    && (type == "directory" || keep rel);

  agentSource = lib.cleanSourceWith {
    src = repoRoot;
    name = "darkfactory-agent-source";
    filter = filterFor (rel: !repositoryOnly rel);
  };

  # The manifests, and the root lockfile only. `bun install --frozen-lockfile`
  # resolves to the root workspace whether it is run from the root or with
  # `--cwd harness` -- measured on origin/develop, both produce the same
  # 166-package layout and leave both lockfiles byte-identical -- so bun.lock at
  # the root is the single lockfile that governs the install. harness/bun.lock is
  # a stale duplicate (lockfileVersion 1, one workspace) that no install path
  # consults, so it is deliberately left out of the input: including a file the
  # derivation does not read would make its hash move for no reason.
  manifestSource = lib.cleanSourceWith {
    src = repoRoot;
    name = "darkfactory-manifests";
    filter = filterFor (rel: baseNameOf rel == "package.json" || rel == "bun.lock");
  };
in
{ inherit agentSource manifestSource; }
