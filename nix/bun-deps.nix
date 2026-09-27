# The JavaScript dependency closure, resolved from the lockfile the repository
# already commits.
#
# Why a fixed-output derivation: `bun install` is the only step in the image that
# needs the network, and everything it downloads is already integrity-checked
# against a sha512 recorded in bun.lock, so its output is a function of the
# lockfile rather than of the registry's current state. That is exactly what a
# fixed-output derivation models: the network is allowed, the result is hashed,
# and the hash is the pin.
#
# Why the input is the manifests only: node_modules does not depend on a single
# .ts file, so editing harness source must not invalidate this derivation, while
# editing a declared dependency or a resolved version must. Verified: a root
# `bun install --frozen-lockfile` over the manifests alone produces a file set
# identical to the same install over the full checkout.
{ lib
, stdenvNoCC
, bun
, manifestSource
}:

stdenvNoCC.mkDerivation {
  pname = "darkfactory-node-modules";

  inherit manifestSource;

  strictDeps = true;
  nativeBuildInputs = [ bun jq ];

  dontConfigure = true;
  dontBuild = true;

  outputHashMode = "recursive-nar";

  # UNPINNED, and the one thing in this flake that has to be filled in by a
  # machine with Nix before the image is reproducible. See nix/README.md:
  #
  #   nix build .#nodeModules      # first run succeeds, hash mismatch reported
  #   # paste the reported sha256-... into outputHash below, and commit it
  #
  # It is left as lib.fakeHash rather than a guessed constant on purpose: a hash
  # nobody computed is a claim nobody checked, and a wrong one fails the build
  # in a way that looks like a corrupted store. Nix prints the real hash, which
  # is a measurement.
  outputHash = lib.fakeHash;

  installPhase = ''
    runHook preInstall

    # Fixed-output derivations run unsandboxed, so anything the build reads or
    # writes outside its own directory has to be pointed somewhere inside it or
    # the result depends on the machine.
    export HOME="$TMPDIR/home"
    export BUN_INSTALL="$TMPDIR/bun"
    export BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache"
    mkdir -p "$HOME" "$BUN_INSTALL" "$BUN_INSTALL_CACHE_DIR"

    # A directory src is not unpacked: nixpkgs builds in the store path itself, and
    # store paths are read-only. bun install has to write node_modules, so the
    # manifests are copied somewhere writable first. chmod because cp -a preserves
    # the source's read-only store modes.
    workspace="$TMPDIR/workspace"
    cp -a ${manifestSource} "$workspace"
    chmod -R u+w "$workspace"
    cd "$workspace"

    # --frozen-lockfile is the whole pin: it refuses to resolve, re-resolve or
    # rewrite, so the output is whatever bun.lock already decided. It also
    # leaves bun.lock untouched, which keeps this derivation's own input stable.
    bun install --frozen-lockfile

    # Every workspace's node_modules, not just the root's and the harness's. This
    # is not tidiness: bun lays out one per workspace -- seventeen on
    # origin/develop -- and the root's contains no @darkfactory/* links at all.
    # Each package resolves its siblings through its own
    # packages/<x>/node_modules/@darkfactory/<y> -> ../../../<y>, so copying only
    # two of the seventeen yields a tree where packages/cli/src cannot import
    # @darkfactory/protocol and `df` dies on the first module load.
    #
    # -prune stops the walk at each node_modules so the copies nested inside one
    # are not visited a second time; they already came with their parent.
    for dir in $(find . -name node_modules -type d -prune | sort); do
      parent=$(dirname "$dir")
      mkdir -p "$out/$parent"
      cp -a "$dir" "$out/$parent/"
    done

    # Every workspace must have produced links that resolve against the manifests
    # that came in with this derivation, for every @darkfactory/* it declares --
    # not just the runtime package's. `cp -a` copied the relative links verbatim
    # (packages/<x>/node_modules/@darkfactory/<y> -> ../../../<y>), which is what
    # makes the closure relocatable, and is also why nix/agent-env.nix has to place
    # it next to packages/. Checking every workspace is what catches a layout that is
    # half-copied, and it fails the build rather than surfacing as a
    # module-not-found when the agent first needs the import.
    for manifest in $(find . -name package.json -not -path "*/node_modules/*" | sort); do
      dir=$(dirname "$manifest")
      for name in $(jq -r '(.dependencies // {}) | keys[]' "$manifest"); do
        case "$name" in
          @darkfactory/*)
            link="$dir/node_modules/$name"
            if [ ! -L "$link" ]; then
              echo "$manifest declares $name but bun produced no link at $link" >&2
              exit 1
            fi
            if [ ! -e "$link" ]; then
              echo "workspace link $link -> $(readlink "$link") does not resolve" >&2
              exit 1
            fi
            ;;
        esac
      done
    done

    runHook postInstall
  '';

  passthru.lockfile = "bun.lock";
}
