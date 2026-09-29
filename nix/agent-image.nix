# The agent image: a Nix-built root filesystem, and a docker archive of it.
#
# Why the image is Nix-built rather than a Debian base with files copied in: the
# Bun this image runs is nixpkgs' Bun, which is patchelf'd against Nix's glibc and
# OpenSSL. Copying that closure into debian:bookworm-slim would put a binary on a
# libc it was not built for, and the failure would surface as a runtime error
# inside the agent rather than as a build error. Carrying the store means the libc
# a binary wants is the libc it got.
#
# Three steps, in order, because each one depends on the last:
#
#   rootfsLayout  the layout, without the store: /opt/darkfactory, /bin, /etc,
#                 /usr/local/bin, /home/agent, /workspace. A store path is
#                 read-only, so the layout cannot be built inside a store path
#                 that also has to hold /nix/store -- which is why the closure
#                 comes next rather than into this one.
#   agentRootfs   the layout plus every store path it references, as real files
#                 under nix/store/. A directory, not a tarball: docker's
#                 copyToRoot takes a directory, and a store path cannot contain
#                 /nix/store.
#   agentImage    the docker archive of agentRootfs.
{ lib
, runCommand
, dockerTools
, nix
, bash
, cacert
, agentEnv
}:

let
  inherit (agentEnv) agentUid agentGid;

  # Names the outside world can state without knowing a hash. Keeping these stable
  # is what lets the image config and a Dockerfile say the same thing.
  entrypointPath = "/usr/local/bin/df-agent-entrypoint";
  dfPath = "/usr/local/bin/df";

  # The PATH the image declares. The closure's own bin directories are prepended
  # to this by the entrypoint wrapper, so this string carries no store path and
  # can be restated verbatim by anything that has to describe the image.
  declaredPath = "/usr/local/bin:/usr/bin:/bin";
in
rec {
  # The layout, once. Both outputs below are built from this one definition, so
  # they cannot disagree about what is in the image.
  rootfsLayout = runCommand "darkfactory-agent-rootfs-layout" { } ''
    mkdir -p "$out"

    cp -a ${agentEnv}/. "$out/"

    # The bind-mount point the agent works in, and the unprivileged identity it
    # works as. The uid is the GitHub runner's own user, so the mount is writable
    # without relaxing permissions, and PRD.md D4 requires the agent not run as
    # root.
    mkdir -p "$out/workspace" "$out/home/agent"

    # /etc is absent from a Nix closure, so the account database is written rather
    # than inherited. There is no /etc/shadow: the account has no password and the
    # image is entered as a fixed uid, not through a login.
    mkdir -p "$out/etc"
    printf '%s\n' \
      "root:x:0:0:root:/root:${bash}/bin/bash" \
      "agent:x:${toString agentUid}:${toString agentGid}:DarkFactory agent:/home/agent:${bash}/bin/bash" \
      > "$out/etc/passwd"
    printf '%s\n' \
      "root:x:0:" \
      "agent:x:${toString agentGid}:" \
      > "$out/etc/group"

    # /bin. A Nix closure is a pile of store paths, not a filesystem: it contains
    # no /bin at all, and this image is FROM nothing, so nothing supplies one.
    # Two things need it before any repository code runs, and neither is the
    # makeWrapper output: those wrappers get a `#! @shell@ -e` shebang, which the
    # setup hooks resolve to the store's bash, so they do not come through /bin.
    # nix/df-wrapper.sh and nix/entrypoint.sh do -- their shebangs are a literal
    # #!/bin/sh -- and so does everything git runs, since git execs /bin/sh for
    # aliases and for every hook. Without this, `df` dies at exec with ENOENT.
    # /bin/bash is linked beside it so the shell named in /etc/passwd above
    # resolves without a store path in it.
    mkdir -p "$out/bin"
    ln -s ${bash}/bin/sh "$out/bin/sh"
    ln -s ${bash}/bin/bash "$out/bin/bash"

    # The trust store, at the path anything OpenSSL-based looks in. `bun` carries
    # its own compiled root store, so this is not what makes the runtime's HTTPS
    # work; it is here so a tool dropped into the container later has one too.
    mkdir -p "$out/etc/ssl/certs"
    ln -s ${cacert}/etc/ssl/certs/ca-bundle.crt "$out/etc/ssl/certs/ca-bundle.crt"

    # The two entry points, at paths that do not change when a hash does.
    mkdir -p "$out/usr/local/bin"
    ln -s ${agentEnv}/bin/df-agent-entrypoint "$out$entrypointPath"
    ln -s ${agentEnv}/bin/df "$out$dfPath"
  '';

  # The image layer is owned by the agent's uid so that its home is writable, which
  # would otherwise make the toolchain writable too. Nix store paths are already
  # mode 0555 and nix/agent-env.nix strips write permission from the copied tree, so
  # the store and the df source stay read-only either way. The chown covers the
  # store as well, because that is how dockerTools.buildImage applies uid/gid --
  # mode is what keeps the tree unwritable, not ownership.
  agentRootfs = runCommand "darkfactory-agent-rootfs"
    {
      # nix-store is what answers "what does this output actually reference".
      # It is taken as an input rather than assumed to be on PATH: a builder's
      # PATH is the stdenv's, and depending on the ambient Nix installation being
      # reachable from inside a sandbox is not a property this file should have.
      nativeBuildInputs = [ nix ];
    }
    ''
      work=$out
      mkdir -p "$work"

      # The closure, at the paths the binaries' interpreters and RPATHs name.
      # Copying each referenced store path whole is what makes the directory
      # self-contained: the result contains nix/store/..., which is /nix/store/...
      # once copied to /. The layout is skipped because --requisites includes the
      # path it is asked about, and the layout is copied separately below; leaving
      # it in would put a second full copy of /opt/darkfactory in the store.
      for path in $(nix-store --query --requisites ${rootfsLayout}); do
        if [ "$path" = "${rootfsLayout}" ]; then continue; fi
        mkdir -p "$work/$(dirname "$path")"
        cp -a "$path" "$work/$path"
      done

      cp -a ${rootfsLayout}/. "$work/"
    '';

  agentImage = dockerTools.buildImage {
    name = "darkfactory-agent";
    tag = "nix";

    # The whole root filesystem, the Nix store included. This has to be
    # agentRootfs and not rootfsLayout: rootfsLayout is the layout without the
    # store, so an image built from it would carry symlinks into /nix/store and
    # nothing at /nix/store, and its entrypoint would fail at exec with ENOENT.
    copyToRoot = agentRootfs;
    uid = agentUid;
    gid = agentGid;
    compressor = "none";

    # The entry point is the wrapped df, so `docker run darkfactory-agent <args>`
    # hands <args> to df unchanged. Note that this is NOT yet a drop-in for the
    # `docker run ... dispatch` step in .github/workflows/agent.yml: df has no
    # top-level `dispatch` subcommand. See nix/entrypoint.sh.
    config = {
      Entrypoint = [ entrypointPath ];
      User = "${toString agentUid}:${toString agentGid}";
      WorkingDir = "/workspace";
      Env = [
        "HOME=/home/agent"
        "PATH=${declaredPath}"
      ];
    };

    meta = {
      description = "DarkFactory agent: the df harness on a pinned Bun, no Python";
    };
  };
}
