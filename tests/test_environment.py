"""Tests for repository environment detection and configuration.

The pipeline is shared by repositories with nothing in common, so the cases that matter are the
polyglot ones: a repository that is several things at once, and a declaration that disagrees with
what detection found.
"""

import json
import os

import pytest

import environment


def _write(root, relative, content):
    """Writes a file, creating parent directories.

    Args:
        root: Base directory.
        relative: Path relative to `root`.
        content: Text to write.
    """
    path = os.path.join(str(root), relative)
    os.makedirs(os.path.dirname(path), exist_ok=True) if os.path.dirname(relative) else None
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(content)


def _manifest(root, block):
    """Writes a `.github/darkfactory.json` carrying an `environment` block.

    Args:
        root: Repository root.
        block: The `environment` object.
    """
    os.makedirs(os.path.join(str(root), ".github"), exist_ok=True)
    _write(root, ".github/darkfactory.json", json.dumps({"environment": block}))


@pytest.fixture
def polyglot(tmp_path):
    """A repository that is a Bun workspace and a Cargo workspace at once."""
    _write(
        tmp_path,
        "package.json",
        json.dumps({"name": "acme", "version": "1.4.0", "workspaces": ["packages/*"]}),
    )
    _write(tmp_path, "bun.lock", "")
    _write(
        tmp_path, "packages/web/package.json", json.dumps({"name": "@acme/web", "version": "1.4.0"})
    )
    _write(
        tmp_path, "packages/cli/package.json", json.dumps({"name": "@acme/cli", "version": "1.3.9"})
    )
    _write(tmp_path, "Cargo.toml", '[workspace]\nmembers = ["crates/*"]\n')
    _write(tmp_path, "Cargo.lock", "")
    _write(tmp_path, "crates/core/Cargo.toml", '[package]\nname = "acme-core"\nversion = "1.4.0"\n')
    return tmp_path


class TestDetection:
    """Detection is the default because it cannot drift."""

    def test_a_single_python_repository(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "thing"\nversion = "2.1.0"\n')
        env = environment.configure(str(tmp_path))
        assert env.ecosystems == {"python"}
        assert not env.is_monorepo
        assert env.packages[0].name == "thing"
        assert env.packages[0].version == "2.1.0"

    def test_a_repository_with_no_manifests_at_all(self, tmp_path):
        _write(tmp_path, "README.md", "# nothing to build")
        env = environment.configure(str(tmp_path))
        assert env.ecosystems == set()
        assert env.packages == []
        assert not env.is_monorepo

    def test_every_ecosystem_in_a_polyglot_repository(self, polyglot):
        env = environment.configure(str(polyglot))
        assert env.ecosystems == {"node", "rust"}
        assert env.has("rust") and env.has("node")
        assert not env.has("go")

    def test_workspace_members_make_it_a_monorepo(self, polyglot):
        env = environment.configure(str(polyglot))
        assert env.is_monorepo
        assert {p.path for p in env.packages} == {
            ".",
            "crates/core",
            "packages/cli",
            "packages/web",
        }

    def test_workspace_roots_are_flagged_with_their_globs(self, polyglot):
        env = environment.configure(str(polyglot))
        roots = {p.ecosystem: p.members for p in env.packages if p.is_workspace_root}
        assert roots == {"node": ["packages/*"], "rust": ["crates/*"]}

    def test_go_modules_are_identified_by_module_path(self, tmp_path):
        _write(tmp_path, "go.mod", "module github.com/acme/tool\n\ngo 1.22\n")
        env = environment.configure(str(tmp_path))
        assert env.packages[0].ecosystem == "go"
        assert env.packages[0].name == "github.com/acme/tool"

    def test_build_output_directories_are_not_scanned(self, tmp_path):
        _write(tmp_path, "package.json", json.dumps({"name": "app", "version": "1.0.0"}))
        _write(tmp_path, "node_modules/dep/package.json", json.dumps({"name": "dep"}))
        _write(tmp_path, "target/pkg/Cargo.toml", '[package]\nname = "junk"\nversion = "0.0.0"\n')
        env = environment.configure(str(tmp_path))
        assert [p.name for p in env.packages] == ["app"]

    def test_a_cargo_toml_that_declares_nothing_is_skipped(self, tmp_path):
        _write(tmp_path, "Cargo.toml", '[dependencies]\nserde = "1"\n')
        env = environment.configure(str(tmp_path))
        assert env.packages == []


class TestPackageManagers:
    """A polyglot root holds several lockfiles, and they must not be confused."""

    def test_bun_is_identified_from_its_lockfile(self, polyglot):
        assert environment.configure(str(polyglot)).package_manager("node") == "bun"

    def test_a_lockfile_does_not_leak_across_ecosystems(self, polyglot):
        """The Cargo workspace root sits beside bun.lock; it is still Cargo."""
        assert environment.configure(str(polyglot)).package_manager("rust") == "cargo"

    @pytest.mark.parametrize(
        "lockfile, expected",
        [
            ("pnpm-lock.yaml", "pnpm"),
            ("yarn.lock", "yarn"),
            ("package-lock.json", "npm"),
        ],
    )
    def test_each_node_manager_is_recognised(self, tmp_path, lockfile, expected):
        _write(tmp_path, "package.json", json.dumps({"name": "app", "version": "1.0.0"}))
        _write(tmp_path, lockfile, "")
        assert environment.configure(str(tmp_path)).package_manager("node") == expected

    def test_uv_and_poetry_are_recognised_for_python(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        _write(tmp_path, "uv.lock", "")
        assert environment.configure(str(tmp_path)).package_manager("python") == "uv"

    def test_no_lockfile_means_no_claim(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        assert environment.configure(str(tmp_path)).package_manager("python") is None

    def test_a_declaration_overrides_the_lockfile(self, polyglot):
        _manifest(polyglot, {"package_managers": {"node": "npm"}})
        assert environment.configure(str(polyglot)).package_manager("node") == "npm"


class TestPnpmWorkspaces:
    """pnpm keeps its members in a separate file rather than in package.json."""

    def test_members_are_read_from_pnpm_workspace_yaml(self, tmp_path):
        _write(tmp_path, "package.json", json.dumps({"name": "root", "version": "1.0.0"}))
        _write(tmp_path, "pnpm-workspace.yaml", "packages:\n  - 'apps/*'\n  - 'libs/*'\n")
        _write(tmp_path, "pnpm-lock.yaml", "")
        env = environment.configure(str(tmp_path))
        root = next(p for p in env.packages if p.path == ".")
        assert root.is_workspace_root
        assert root.members == ["apps/*", "libs/*"]
        assert env.is_monorepo


class TestDeclaredConfiguration:
    """Declaration exists for what detection cannot see."""

    def test_an_ignored_path_is_dropped(self, polyglot):
        _manifest(polyglot, {"ignore": ["packages/cli"]})
        env = environment.configure(str(polyglot))
        assert "packages/cli" not in {p.path for p in env.packages}
        assert "packages/web" in {p.path for p in env.packages}

    def test_glob_patterns_are_honoured_when_ignoring(self, polyglot):
        _manifest(polyglot, {"ignore": ["packages/*"]})
        env = environment.configure(str(polyglot))
        assert not any(p.path.startswith("packages/") for p in env.packages)

    def test_a_declared_package_is_added(self, tmp_path):
        _write(tmp_path, "README.md", "no manifests here")
        _manifest(
            tmp_path,
            {
                "packages": [
                    {
                        "path": "weird",
                        "ecosystem": "make",
                        "manifest": "weird/Makefile",
                        "name": "weird",
                    }
                ]
            },
        )
        env = environment.configure(str(tmp_path))
        assert [(p.path, p.ecosystem, p.name) for p in env.packages] == [("weird", "make", "weird")]

    def test_a_declaration_corrects_a_detected_package(self, tmp_path):
        _write(tmp_path, "pyproject.toml", "[tool.black]\nline-length = 100\n")
        _manifest(
            tmp_path,
            {
                "packages": [
                    {"path": ".", "ecosystem": "python", "name": "darkfactory", "version": "0.1.0"}
                ]
            },
        )
        env = environment.configure(str(tmp_path))
        assert env.packages[0].name == "darkfactory"
        assert env.packages[0].version == "0.1.0"

    def test_declaring_nothing_leaves_detection_untouched(self, polyglot):
        _manifest(polyglot, {})
        # Five, not four: the root holds both a node and a rust manifest, so it is two packages.
        assert len(environment.configure(str(polyglot)).packages) == 5


class TestSerialisation:
    """Workflow steps consume this as JSON, so it has to survive the round trip."""

    def test_the_environment_serialises(self, polyglot):
        payload = environment.configure(str(polyglot)).as_dict()
        assert json.loads(json.dumps(payload)) == payload
        assert payload["is_monorepo"] is True
        assert payload["ecosystems"] == ["node", "rust"]


class TestPlans:
    """Testing, formatting and documentation are planned the same way, per ecosystem."""

    def test_each_ecosystem_gets_its_own_command(self, polyglot):
        env = environment.configure(str(polyglot))
        assert env.test_plan()["node"]["command"] == "bun test"
        assert env.test_plan()["rust"]["command"] == "cargo test --all-features --workspace"

    def test_polyglot_plans_cover_every_ecosystem(self, polyglot):
        env = environment.configure(str(polyglot))
        for plan in (env.test_plan(), env.format_plan(), env.docs_plan()):
            assert set(plan) == {"node", "rust"}

    def test_the_package_manager_picks_the_command(self, tmp_path):
        _write(tmp_path, "package.json", json.dumps({"name": "a", "version": "1.0.0"}))
        _write(tmp_path, "pnpm-lock.yaml", "")
        assert environment.configure(str(tmp_path)).test_plan()["node"]["command"] == "pnpm test"

    def test_python_carries_a_version_matrix_and_others_do_not(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        _write(tmp_path, "Cargo.toml", '[package]\nname = "y"\nversion = "1.0.0"\n')
        plan = environment.configure(str(tmp_path)).test_plan()
        assert plan["python"]["versions"] == ["3.10", "3.11", "3.12", "3.13"]
        assert plan["rust"]["versions"] == []

    def test_documentation_names_the_inline_source_per_ecosystem(self, polyglot):
        plan = environment.configure(str(polyglot)).docs_plan()
        assert plan["node"]["source"] == "tsdoc"
        assert plan["rust"]["source"] == "rustdoc"

    def test_python_documentation_comes_from_docstrings(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        assert environment.configure(str(tmp_path)).docs_plan()["python"]["source"] == "docstrings"

    def test_a_declared_command_overrides_the_default(self, polyglot):
        _manifest(polyglot, {"testing": {"rust": {"command": "cargo nextest run"}}})
        plan = environment.configure(str(polyglot)).test_plan()
        assert plan["rust"]["command"] == "cargo nextest run"
        assert plan["node"]["command"] == "bun test", "other ecosystems keep their defaults"

    def test_a_declared_matrix_overrides_the_default(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        _manifest(tmp_path, {"testing": {"python": {"versions": ["3.12"]}}})
        assert environment.configure(str(tmp_path)).test_plan()["python"]["versions"] == ["3.12"]

    def test_an_ecosystem_can_be_disabled(self, polyglot):
        _manifest(polyglot, {"testing": {"rust": {"enabled": False}}})
        assert set(environment.configure(str(polyglot)).test_plan()) == {"node"}

    def test_an_undetectable_suite_can_be_declared(self, tmp_path):
        _write(tmp_path, "README.md", "nothing detectable")
        _manifest(tmp_path, {"testing": {"e2e": {"command": "make e2e"}}})
        assert environment.configure(str(tmp_path)).test_plan()["e2e"]["command"] == "make e2e"

    def test_a_biome_marker_outranks_the_package_manager_default(self, tmp_path):
        _write(tmp_path, "package.json", json.dumps({"name": "a", "version": "1.0.0"}))
        _write(tmp_path, "bun.lock", "")
        _write(tmp_path, "biome.json", "{}")
        command = environment.configure(str(tmp_path)).format_plan()["node"]["command"]
        assert "biome" in command

    def test_ruff_marker_outranks_black(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        _write(tmp_path, "ruff.toml", "")
        assert (
            environment.configure(str(tmp_path)).format_plan()["python"]["command"]
            == "ruff format ."
        )

    def test_a_marker_does_not_affect_the_test_plan(self, tmp_path):
        _write(tmp_path, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n')
        _write(tmp_path, "ruff.toml", "")
        assert environment.configure(str(tmp_path)).test_plan()["python"]["command"] == "pytest"

    def test_plans_survive_json_serialisation(self, polyglot):
        payload = environment.configure(str(polyglot)).as_dict()
        assert json.loads(json.dumps(payload)) == payload
        assert set(payload) >= {"test_plan", "format_plan", "docs_plan"}


class TestDomains:
    """A domain says what kind of governance a package answers to, above its toolchain."""

    def test_every_code_ecosystem_maps_to_the_code_domain(self, polyglot):
        """Node and Rust differ in toolchain but are both code."""
        env = environment.configure(str(polyglot))
        assert env.domains == {"code"}
        assert env.is_multi_domain is False

    def test_an_undeclared_ecosystem_still_gets_a_domain(self, tmp_path):
        """A repository may invent an ecosystem; planning it must not crash for want of a domain."""
        _manifest(tmp_path, {"packages": [{"path": "weird", "ecosystem": "make", "name": "weird"}]})
        env = environment.configure(str(tmp_path))
        assert env.packages[0].domain == environment.DEFAULT_DOMAIN
        assert env.domains == {"code"}

    def test_a_thesis_beside_its_software_is_multi_domain(self, tmp_path):
        """The case the layer exists for: a paper and the code it documents, in one repository."""
        _write(tmp_path, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n')
        _manifest(
            tmp_path,
            {
                "packages": [
                    {"path": ".", "ecosystem": "python", "name": "engine", "version": "0.1.0"},
                    {"path": "paper", "ecosystem": "typst", "name": "thesis"},
                ]
            },
        )
        env = environment.configure(str(tmp_path))
        assert env.domains == {"code", "paper"}
        assert env.is_multi_domain is True
        assert [p.path for p in env.packages_in("paper")] == ["paper"]
        assert [p.path for p in env.packages_in("code")] == ["."]
        assert env.has_domain("paper") and not env.has_domain("math")

    def test_the_domain_is_reported_as_plain_data(self, tmp_path):
        """Workflows branch on the domain, so it must survive the JSON round trip."""
        _write(tmp_path, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n')
        payload = environment.configure(str(tmp_path)).as_dict()
        assert payload["domains"] == ["code"]
        assert payload["is_multi_domain"] is False
        assert payload["packages"][0]["domain"] == "code"


class TestPaperDomain:
    """A paper is typeset rather than tested, and the document is the artifact."""

    def test_typst_is_detected_and_lands_in_the_paper_domain(self, tmp_path):
        """`typst.toml` is to a paper what `Cargo.toml` is to a crate."""
        _write(tmp_path, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n')
        env = environment.configure(str(tmp_path))
        assert env.ecosystems == {"typst"}
        assert env.domains == {"paper"}
        assert env.packages[0].name == "thesis"
        assert env.packages[0].version == "1.0.0"

    def test_latexmkrc_is_detected_even_though_it_names_nothing(self, tmp_path):
        """A latexmk configuration carries no name or version; its presence is the whole signal."""
        _write(tmp_path, ".latexmkrc", "$pdf_mode = 1;\n")
        env = environment.configure(str(tmp_path))
        assert env.ecosystems == {"latex"}
        assert env.domains == {"paper"}
        assert env.packages[0].name is None

    def test_typesetting_is_the_test_and_the_build(self, tmp_path):
        """There is no separate release build of a document."""
        _write(tmp_path, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n')
        env = environment.configure(str(tmp_path))
        assert env.test_plan()["typst"]["command"] == "typst compile main.typ out/paper.pdf"
        assert env.build_plan()["typst"]["command"] == "typst compile main.typ out/paper.pdf"
        assert env.build_plan()["typst"]["artifacts"] == ["out/*.pdf", "*.pdf"]

    def test_a_paper_needs_no_api_documentation(self, tmp_path):
        """A document has no inline source to extract a reference from."""
        _write(tmp_path, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n')
        assert environment.configure(str(tmp_path)).docs_plan()["typst"]["command"] is None

    def test_a_thesis_beside_its_software_plans_both(self, tmp_path):
        """The motivating case: detection alone, with no declaration, finds both domains."""
        _write(tmp_path, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n')
        _write(tmp_path, "engine/pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n')
        env = environment.configure(str(tmp_path))
        assert env.domains == {"paper", "code"}
        assert env.is_multi_domain is True
        plan = env.test_plan()
        assert plan["typst"]["command"].startswith("typst compile")
        assert plan["python"]["command"] == "pytest"
