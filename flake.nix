{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      utils,
    }:
    utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs { inherit system; };
      in
      {
        devShells.default =
          with pkgs;
          mkShell {
            buildInputs = [
              tree-sitter
              tree-sitter-grammars.tree-sitter-javascript
              tree-sitter-grammars.tree-sitter-typescript
              nodejs
              typescript
              nodePackages.typescript
              nodePackages.typescript-language-server
              (python311Packages.python.withPackages (p: [ p.rangehttpserver ]))
            ];
            shellHook = ''
              export npm_config_prefix=$PWD/.npm-global
              export PATH=$npm_config_prefix/bin:$PATH
              export NODE_PATH=$npm_config_prefix/lib/node_modules
            '';
          };
      }
    );
}
