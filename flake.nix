{
  description = "DarkFactory production agent image";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/e94cb152ed51bd6e24eb4a41f1460252beb52cd2";
  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      eachSystem = f: builtins.listToAttrs (map (system: {
        name = system; value = f system;
      }) systems);
      agentFor = system:
        import ./nix/agent.nix { pkgs = import nixpkgs { inherit system; }; };
    in {
      packages = eachSystem (system:
        let agent = agentFor system;
        in { inherit (agent) agentImage nodeModules agentRuntime; default = agent.agentImage; });
      checks = eachSystem (system:
        let
          agent = agentFor system;
          pkgs = import nixpkgs { inherit system; };
        in {
          runtime-smoke = pkgs.runCommand "darkfactory-runtime-smoke" { } ''
            ${agent.df}/bin/df --help >/dev/null
            ${agent.df}/bin/df --version >/dev/null
            ${agent.df}/bin/df providers >/dev/null
            ${agent.df}/bin/df __packaging-smoke >/dev/null
            touch "$out"
          '';
        });
    };
}
