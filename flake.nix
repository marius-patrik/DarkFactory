{
  description = "DarkFactory agent image, derived from a pinned nixpkgs (#1202)";

  # Pinned to an exact revision, not a branch. A flake whose toolchain can move
  # under it is not a derivation, it is a wish -- and the whole point of replacing
  # a hand-pinned Dockerfile is that the toolchain stops being something a human
  # remembers to update. This revision (nixos-unstable, 2026-09-25) carries Bun
  # 1.4.2, which is the version docker/Dockerfile.agent:35 pinned by hand with
  # `ARG BUN_VERSION=1.4.2` and the only Bun pin anywhere in the repository. The
  # assertion in `agentFor` below turns a future bump that moves Bun into an
  # evaluation error rather than a silently different runtime.
  #
  # Run `nix flake lock` on a machine with Nix to generate flake.lock from this
  # revision, and commit it. It is not committed here because a lockfile is a
  # measurement: writing narHashes that no `nix` run produced would mean inventing
  # the one file in this change that has to be true. See nix/README.md.
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/e94cb152ed51bd6e24eb4a41f1460252beb52cd2";
  };

  outputs =
    { self, nixpkgs }:
    let
      lib = nixpkgs.lib;

      # The two architectures the agent image is built for. #1180 needs a
      # per-architecture matrix, and a derivation is already per-system: there is
      # no x86_64 assumption anywhere below, so building on an aarch64 machine
      # produces the aarch64 image rather than a cross-compiled approximation.
      #
      # The JavaScript closure is architecture-specific, because bun resolves the
      # platform's optional dependencies at install time (esbuild, biome, and the
      # clipboard prebuilds all ship one binary per platform). These outputs are
      # therefore built natively per architecture, which is what the runners do.
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      # The repository, as a plain path rather than a store path. The two filters
      # in nix/sources.nix each do a cleanSourceWith, and that is the only copy
      # into the store that needs to happen. Copying the tree first with
      # builtins.path would put the whole checkout -- .git, node_modules and all
      # -- in the store before anything was filtered out of it.
      repoRoot = ./.;

      # The version the repository states for itself.
      repoVersion = builtins.head (lib.splitString "\n" (builtins.readFile ./VERSION));

      # What docker/Dockerfile.agent pinned with `ARG BUN_VERSION`.
      requiredBunVersion = "1.4.2";

      # One definition of the agent environment, shared by `packages` and `checks`
      # so a check can never run against a different environment than the one the
      # image is built from.
      agentFor =
        pkgs:
        let
          inherit (import ./nix/sources.nix { inherit lib repoRoot; }) agentSource manifestSource;

          bun = assert pkgs.bun.version == requiredBunVersion; pkgs.bun;

          nodeModules = import ./nix/bun-deps.nix {
            inherit (pkgs) lib stdenvNoCC bun;
            inherit manifestSource;
          };

          agentEnv = import ./nix/agent-env.nix {
            inherit (pkgs) lib stdenvNoCC makeWrapper bun git libsecret dbus;
            inherit (pkgs) gnome-keyring bash;
            inherit agentSource nodeModules;
            dfWrapperScript = ./nix/df-wrapper.sh;
            entrypointScript = ./nix/entrypoint.sh;
            version = repoVersion;
          };
        in
        {
          inherit bun nodeModules agentEnv;
          image = import ./nix/agent-image.nix {
            inherit (pkgs) lib runCommand dockerTools bash cacert nix;
            inherit agentEnv;
          };
        };

      forEachSystem =
        f: lib.genAttrs systems (system: f system (import nixpkgs { inherit system; }));
    in
    {
      packages = forEachSystem (
        system:
        pkgs:
        let
          agent = agentFor pkgs;
        in
        {
          # A docker-archive tarball: `nix build .#agentImage` then
          # `docker load < result`. This is what a CI job should consume.
          inherit (agent.image) agentImage;

          # The same tree as a plain directory -- the Nix store and the root
          # filesystem. Useful on its own for inspecting what the image contains:
          # `nix build .#agentRootfs && find result -maxdepth 2`.
          inherit (agent.image) agentRootfs;

          # The environment on its own, for running a df identical to the image's
          # outside a container: `nix build .#agentEnv` then
          # `result/bin/df --help`. This is the documented local entry point -- the
          # same closure CI runs, not an approximation of it.
          inherit (agent) agentEnv nodeModules;

          # Not `self.packages.${system}.agentImage`: a default that reaches back
          # through self is a cycle waiting for a future attribute.
          default = agent.image.agentImage;
        }
      );

      devShells = forEachSystem (
        _system:
        pkgs:
        {
          # A shell carrying the toolchain the image is built from, so a CI failure
          # can be reproduced locally against the same Bun rather than against
          # whatever bun the workstation happens to have.
          #
          # The tree is deliberately not installed here. Bun lays workspace links
          # out as relative symlinks (../../../packages/...), which resolve only
          # when node_modules sits beside the real packages/, so linking a
          # Nix-built node_modules into a checkout would break them. Run
          # `bun install --frozen-lockfile` in the checkout: that is the same
          # install nix/bun-deps.nix performs, from the same lockfile.
          default = pkgs.mkShell {
            name = "darkfactory-agent-toolchain";
            packages = with pkgs; [
              bun
              git
              libsecret
              dbus
              gnome-keyring
              cacert
            ];
            shellHook = ''
              echo "agent toolchain: bun $(bun --version) -- the version flake.nix pins"
              echo "the image's own environment: nix build .#agentEnv && result/bin/df --help"
            '';
          };
        }
      );

      checks = forEachSystem (
        _system:
        pkgs:
        let
          agent = agentFor pkgs;
        in
        import ./nix/checks.nix {
          inherit (pkgs) lib runCommand nix;
          inherit (agent) agentEnv;
        }
      );
    };
}
