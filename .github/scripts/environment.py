"""Detects and configures what a repository is actually made of.

The pipeline is shared across repositories that look nothing alike: a Python package, a Rust and
TypeScript desktop application, a template repository with no build at all. Every part of the
pipeline needs the same answer to "what is in here" - which CI jobs are worth running, what the
release job should package, which manifests must agree on the version - so that question is
answered once, here, instead of being re-guessed with `hashFiles` in each workflow.

Detection is the default because it cannot drift: a repository that grows a `Cargo.toml` starts
building Rust without anyone remembering to declare it. Declaration is available for the cases
detection cannot see - a package deliberately excluded, a build command that is not the ecosystem's
default, an artifact produced by something bespoke. The two compose: `.github/darkfactory.json`
overrides and extends what detection found, and never has to restate it.

Workspaces are first-class. npm, Bun, pnpm, Yarn and Cargo all express monorepos as a root manifest
listing member globs, so a repository is walked as a tree of packages rather than a single one, and
`is_monorepo` reports what was found rather than what was assumed.
"""

import fnmatch
import json
import os
import re
from typing import Any, Dict, List, Optional, Sequence, Set

try:  # Python 3.11+
    import tomllib
except ModuleNotFoundError:  # pragma: no cover - exercised on 3.10 only
    try:
        import tomli as tomllib  # type: ignore[no-redef]
    except ModuleNotFoundError:  # pragma: no cover - degraded but not fatal
        tomllib = None  # type: ignore[assignment]

#: Directories never worth descending into when looking for package manifests.
PRUNED = frozenset(
    {
        ".git",
        ".venv",
        "venv",
        "node_modules",
        "target",
        "dist",
        "build",
        "site",
        "__pycache__",
        ".pytest_cache",
        ".mypy_cache",
        ".ruff_cache",
        "vendor",
    }
)

#: Manifest filename -> ecosystem it declares.
MANIFESTS: Dict[str, str] = {
    "pyproject.toml": "python",
    "setup.py": "python",
    "setup.cfg": "python",
    "package.json": "node",
    "Cargo.toml": "rust",
    "go.mod": "go",
    "deno.json": "deno",
    "deno.jsonc": "deno",
}

#: Ecosystem -> its lockfiles paired with the manager that writes them, most specific first.
#:
#: Scoped per ecosystem rather than kept in one flat table: a polyglot repository root holds several
#: lockfiles at once, and a flat lookup would report whichever happened to be listed first - a
#: Cargo workspace beside a `bun.lock` would claim its package manager is Bun.
LOCKFILES: Dict[str, Sequence[tuple]] = {
    "node": (
        ("bun.lock", "bun"),
        ("bun.lockb", "bun"),
        ("pnpm-lock.yaml", "pnpm"),
        ("yarn.lock", "yarn"),
        ("package-lock.json", "npm"),
    ),
    "deno": (("deno.lock", "deno"),),
    "python": (
        ("uv.lock", "uv"),
        ("poetry.lock", "poetry"),
        ("Pipfile.lock", "pipenv"),
    ),
    "rust": (("Cargo.lock", "cargo"),),
    "go": (("go.sum", "go"),),
}

#: How far below the root to look for member packages when no workspace globs are declared.
MAX_DEPTH = 4

#: Default test command per ecosystem, keyed by package manager where the manager decides it.
#: `None` is the fallback used when no lockfile identified a manager.
TEST_COMMANDS: Dict[str, Dict[Optional[str], str]] = {
    "python": {
        "uv": "uv run pytest",
        "poetry": "poetry run pytest",
        None: "pytest",
    },
    "node": {
        "bun": "bun test",
        "pnpm": "pnpm test",
        "yarn": "yarn test",
        "npm": "npm test",
        None: "npm test",
    },
    "deno": {None: "deno test -A"},
    "rust": {None: "cargo test --all-features --workspace"},
    "go": {None: "go test ./..."},
}

#: Default runtime matrix per ecosystem. Empty means "one job, whatever the runner provides".
TEST_MATRIX: Dict[str, List[str]] = {
    "python": ["3.10", "3.11", "3.12", "3.13"],
    "node": [],
    "deno": [],
    "rust": [],
    "go": [],
}

#: Default formatter per ecosystem, keyed by package manager where the manager decides it.
FORMAT_COMMANDS: Dict[str, Dict[Optional[str], str]] = {
    "python": {
        "uv": "uv run black .",
        "poetry": "poetry run black .",
        None: "black .",
    },
    "node": {
        "bun": "bun run format",
        "pnpm": "pnpm run format",
        "yarn": "yarn format",
        "npm": "npm run format",
        None: "npx prettier --write .",
    },
    "deno": {None: "deno fmt"},
    "rust": {None: "cargo fmt --all"},
    "go": {None: "gofmt -w ."},
}

#: Where each ecosystem's API documentation is extracted from, and the tool that extracts it.
#:
#: `AGENTS.md` rule 2 requires documentation to be generated from source rather than mirrored by
#: hand, so each ecosystem contributes its own inline convention to one site: rustdoc comments,
#: TSDoc, and Google-style docstrings are three inputs to the same build.
DOC_SOURCES: Dict[str, str] = {
    "python": "docstrings",
    "node": "tsdoc",
    "deno": "jsdoc",
    "rust": "rustdoc",
    "go": "godoc",
}

#: Default API-documentation command per ecosystem, keyed by package manager where it decides.
DOC_COMMANDS: Dict[str, Dict[Optional[str], str]] = {
    "python": {
        "uv": "uv run properdocs build --strict",
        None: "properdocs build --strict",
    },
    "node": {
        "bun": "bun run docs",
        "pnpm": "pnpm run docs",
        "yarn": "yarn docs",
        "npm": "npm run docs",
        None: "npx typedoc",
    },
    "deno": {None: "deno doc --html"},
    "rust": {None: "cargo doc --no-deps --all-features"},
    "go": {None: "go doc ./..."},
}

#: Marker files that name a formatter outright, overriding the package-manager default.
FORMATTER_MARKERS: Sequence[tuple] = (
    ("biome.json", "node", "npx @biomejs/biome format --write ."),
    ("biome.jsonc", "node", "npx @biomejs/biome format --write ."),
    ("ruff.toml", "python", "ruff format ."),
    (".ruff.toml", "python", "ruff format ."),
)


class Package:
    """One buildable unit inside a repository.

    Attributes:
        path: Directory holding the package, relative to the repository root (`"."` for the root).
        ecosystem: One of the values in `MANIFESTS`.
        manifest: The manifest file, relative to the repository root.
        name: Declared package name, when the manifest states one.
        version: Declared version, when the manifest states one.
        is_workspace_root: Whether this manifest declares workspace members.
        members: Raw member globs declared by a workspace root.
    """

    def __init__(
        self,
        path: str,
        ecosystem: str,
        manifest: str,
        name: Optional[str] = None,
        version: Optional[str] = None,
        is_workspace_root: bool = False,
        members: Optional[List[str]] = None,
    ) -> None:
        self.path = path
        self.ecosystem = ecosystem
        self.manifest = manifest
        self.name = name
        self.version = version
        self.is_workspace_root = is_workspace_root
        self.members = members or []

    def as_dict(self) -> Dict[str, Any]:
        """Returns the package as plain data, for a workflow step to consume.

        Returns:
            A JSON-serialisable mapping of every attribute.
        """
        return {
            "path": self.path,
            "ecosystem": self.ecosystem,
            "manifest": self.manifest,
            "name": self.name,
            "version": self.version,
            "is_workspace_root": self.is_workspace_root,
            "members": self.members,
        }

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return f"Package({self.ecosystem}:{self.path} name={self.name!r} version={self.version!r})"

    def __eq__(self, other: object) -> bool:
        if not isinstance(other, Package):
            return NotImplemented
        return self.as_dict() == other.as_dict()


class Environment:
    """Everything the pipeline needs to know about a repository's shape.

    Attributes:
        root: Absolute path to the repository root.
        packages: Every package found, root first.
        declared: The `environment` block from the repository manifest, if any.
    """

    def __init__(self, root: str, packages: List[Package], declared: Dict[str, Any]) -> None:
        self.root = root
        self.packages = packages
        self.declared = declared

    @property
    def ecosystems(self) -> Set[str]:
        """Returns the distinct ecosystems present.

        Returns:
            Ecosystem names, e.g. `{"python", "rust"}`.
        """
        return {package.ecosystem for package in self.packages}

    @property
    def is_monorepo(self) -> bool:
        """Reports whether the repository holds more than one package.

        Returns:
            True when a workspace root declares members, or several packages were found.
        """
        if any(package.is_workspace_root and package.members for package in self.packages):
            return True
        return len({package.path for package in self.packages}) > 1

    def packages_for(self, ecosystem: str) -> List[Package]:
        """Selects the packages belonging to one ecosystem.

        Args:
            ecosystem: Ecosystem name.

        Returns:
            Matching packages, in discovery order.
        """
        return [package for package in self.packages if package.ecosystem == ecosystem]

    def has(self, ecosystem: str) -> bool:
        """Reports whether an ecosystem is present.

        Args:
            ecosystem: Ecosystem name.

        Returns:
            True when at least one package declares it.
        """
        return ecosystem in self.ecosystems

    def package_manager(self, ecosystem: str) -> Optional[str]:
        """Identifies the package manager in use for an ecosystem, from its lockfile.

        Args:
            ecosystem: Ecosystem name.

        Returns:
            The manager's name, or `None` when no lockfile identifies one.
        """
        declared = self.declared.get("package_managers", {})
        if ecosystem in declared:
            return str(declared[ecosystem])
        candidates = LOCKFILES.get(ecosystem, ())
        for package in self.packages_for(ecosystem):
            directory = os.path.join(self.root, package.path)
            for filename, manager in candidates:
                if os.path.isfile(os.path.join(directory, filename)):
                    return manager
        return None

    def _plan(
        self,
        block: str,
        defaults: Dict[str, Dict[Optional[str], str]],
        matrix: Optional[Dict[str, List[str]]] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """Builds a per-ecosystem command plan from detection plus declaration.

        The command is derived from what was detected - the package manager decides it, so a Bun
        workspace runs `bun test` without anyone saying so - and the named manifest block overrides
        it per ecosystem. Declaring `enabled: false` removes an ecosystem from the plan, and an
        ecosystem the repository does not contain can still be declared, for work detection cannot
        see.

        Args:
            block: Manifest key holding the overrides, e.g. `"testing"`.
            defaults: Ecosystem -> package manager -> command.
            matrix: Ecosystem -> default runtime versions, when the plan has a matrix.

        Returns:
            Mapping of ecosystem to `command`, `versions` and `manager`.
        """
        declared = self.declared.get(block, {}) or {}
        plan: Dict[str, Dict[str, Any]] = {}
        for ecosystem in sorted(self.ecosystems):
            settings = declared.get(ecosystem, {}) or {}
            if settings.get("enabled") is False:
                continue
            manager = self.package_manager(ecosystem)
            commands = defaults.get(ecosystem, {})
            command = settings.get("command") or self._marker_command(ecosystem, block)
            command = command or commands.get(manager) or commands.get(None)
            versions = settings.get("versions")
            if versions is None:
                versions = (matrix or {}).get(ecosystem, [])
            plan[ecosystem] = {
                "command": command,
                "versions": [str(entry) for entry in versions],
                "manager": manager,
            }
        for ecosystem, settings in declared.items():
            if ecosystem not in plan and settings and settings.get("enabled") is not False:
                if settings.get("command"):
                    plan[ecosystem] = {
                        "command": settings["command"],
                        "versions": [str(entry) for entry in settings.get("versions", [])],
                        "manager": None,
                    }
        return plan

    def _marker_command(self, ecosystem: str, block: str) -> Optional[str]:
        """Finds a formatter named outright by a configuration file in the tree.

        A repository carrying `biome.json` has chosen Biome regardless of which package manager
        installed it, so the marker outranks the manager default.

        Args:
            ecosystem: Ecosystem name.
            block: Manifest block being planned; only `"formatting"` consults markers.

        Returns:
            The command, or `None` when no marker applies.
        """
        if block != "formatting":
            return None
        for filename, marker_ecosystem, command in FORMATTER_MARKERS:
            if marker_ecosystem != ecosystem:
                continue
            for package in self.packages_for(ecosystem):
                if os.path.isfile(os.path.join(self.root, package.path, filename)):
                    return command
        return None

    def test_plan(self) -> Dict[str, Dict[str, Any]]:
        """Works out how to test each ecosystem present.

        Returns:
            Mapping of ecosystem to `command`, `versions` and `manager`.
        """
        return self._plan("testing", TEST_COMMANDS, TEST_MATRIX)

    def format_plan(self) -> Dict[str, Dict[str, Any]]:
        """Works out how to format each ecosystem present.

        Returns:
            Mapping of ecosystem to `command`, `versions` and `manager`. Formatting has no matrix,
            so `versions` is empty unless the manifest declares one.
        """
        return self._plan("formatting", FORMAT_COMMANDS)

    def docs_plan(self) -> Dict[str, Dict[str, Any]]:
        """Works out how each ecosystem's API documentation is produced.

        Returns:
            Mapping of ecosystem to `command`, `versions`, `manager` and `source`, where `source`
            names the inline convention the documentation is extracted from.
        """
        plan = self._plan("documentation", DOC_COMMANDS)
        declared = self.declared.get("documentation", {}) or {}
        for ecosystem, entry in plan.items():
            settings = declared.get(ecosystem, {}) or {}
            entry["source"] = settings.get("source") or DOC_SOURCES.get(ecosystem)
        return plan

    def as_dict(self) -> Dict[str, Any]:
        """Returns the whole environment as plain data.

        Returns:
            A JSON-serialisable summary, suitable for a workflow output.
        """
        return {
            "ecosystems": sorted(self.ecosystems),
            "is_monorepo": self.is_monorepo,
            "packages": [package.as_dict() for package in self.packages],
            "package_managers": {
                ecosystem: self.package_manager(ecosystem) for ecosystem in sorted(self.ecosystems)
            },
            "test_plan": self.test_plan(),
            "format_plan": self.format_plan(),
            "docs_plan": self.docs_plan(),
        }


def _load_toml(path: str) -> Dict[str, Any]:
    """Parses a TOML file, tolerating an absent parser.

    Args:
        path: Absolute path to the file.

    Returns:
        The parsed document, or an empty mapping if it cannot be read.
    """
    if tomllib is None:  # pragma: no cover - only without tomli on 3.10
        return {}
    try:
        with open(path, "rb") as handle:
            return tomllib.load(handle)
    except (OSError, ValueError):
        return {}


def _load_json(path: str) -> Dict[str, Any]:
    """Parses a JSON file, tolerating malformed content.

    Args:
        path: Absolute path to the file.

    Returns:
        The parsed document, or an empty mapping if it cannot be read.
    """
    try:
        with open(path, encoding="utf-8") as handle:
            loaded = json.load(handle)
    except (OSError, ValueError):
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _read_package(root: str, directory: str, filename: str) -> Optional[Package]:
    """Builds a `Package` from one manifest file.

    Args:
        root: Absolute repository root.
        directory: Repository-relative directory holding the manifest.
        filename: Manifest filename.

    Returns:
        The package, or `None` when the file declares nothing useful.
    """
    ecosystem = MANIFESTS[filename]
    relative = os.path.join(directory, filename) if directory != "." else filename
    absolute = os.path.join(root, relative)
    name: Optional[str] = None
    version: Optional[str] = None
    members: List[str] = []

    if filename == "package.json":
        data = _load_json(absolute)
        name = data.get("name")
        version = data.get("version")
        workspaces = data.get("workspaces")
        if isinstance(workspaces, dict):
            workspaces = workspaces.get("packages")
        if isinstance(workspaces, list):
            members = [str(entry) for entry in workspaces]

    elif filename == "pyproject.toml":
        data = _load_toml(absolute)
        project = data.get("project", {})
        name = project.get("name")
        version = project.get("version")
        if not name:
            name = data.get("tool", {}).get("poetry", {}).get("name")
            version = version or data.get("tool", {}).get("poetry", {}).get("version")
        members = [
            str(entry)
            for entry in data.get("tool", {}).get("uv", {}).get("workspace", {}).get("members", [])
        ]

    elif filename == "Cargo.toml":
        data = _load_toml(absolute)
        package = data.get("package", {})
        name = package.get("name")
        version = package.get("version")
        if isinstance(version, dict):  # `version.workspace = true`
            version = None
        workspace = data.get("workspace", {})
        members = [str(entry) for entry in workspace.get("members", [])]
        if not name and not members:
            return None

    elif filename == "go.mod":
        try:
            with open(absolute, encoding="utf-8") as handle:
                match = re.search(r"^module\s+(\S+)", handle.read(), re.MULTILINE)
            name = match.group(1) if match else None
        except OSError:
            return None

    elif filename in ("deno.json", "deno.jsonc"):
        data = _load_json(absolute)
        name = data.get("name")
        version = data.get("version")
        workspace = data.get("workspace")
        if isinstance(workspace, list):
            members = [str(entry) for entry in workspace]

    elif filename in ("setup.py", "setup.cfg"):
        # Both are legacy shims; presence is the signal, contents are not worth parsing.
        pass

    return Package(
        path=directory,
        ecosystem=ecosystem,
        manifest=relative,
        name=name,
        version=version,
        is_workspace_root=bool(members),
        members=members,
    )


def _pnpm_members(root: str) -> List[str]:
    """Reads workspace globs from `pnpm-workspace.yaml` without a YAML dependency.

    Args:
        root: Absolute repository root.

    Returns:
        The declared globs, or an empty list.
    """
    path = os.path.join(root, "pnpm-workspace.yaml")
    if not os.path.isfile(path):
        return []
    globs: List[str] = []
    in_packages = False
    try:
        with open(path, encoding="utf-8") as handle:
            for line in handle:
                stripped = line.strip()
                if stripped.startswith("packages:"):
                    in_packages = True
                    continue
                if in_packages:
                    if stripped.startswith("- "):
                        globs.append(stripped[2:].strip().strip("'\""))
                    elif stripped and not stripped.startswith("#"):
                        break
    except OSError:  # pragma: no cover - environment guard
        return []
    return globs


def detect(root: str) -> List[Package]:
    """Walks a repository and reports every package manifest it holds.

    Args:
        root: Absolute or relative path to the repository root.

    Returns:
        Packages, root-level ones first, then by path.
    """
    root = os.path.abspath(root)
    found: List[Package] = []
    for current, directories, filenames in os.walk(root):
        directories[:] = [
            entry for entry in directories if entry not in PRUNED and not entry.startswith(".")
        ]
        relative = os.path.relpath(current, root)
        depth = 0 if relative == "." else relative.count(os.sep) + 1
        if depth > MAX_DEPTH:
            directories[:] = []
            continue
        for filename in filenames:
            if filename in MANIFESTS:
                package = _read_package(root, relative, filename)
                if package is not None:
                    found.append(package)

    # A directory with both pyproject.toml and setup.py is one Python package, not two.
    deduplicated: Dict[tuple, Package] = {}
    for package in found:
        key = (package.path, package.ecosystem)
        existing = deduplicated.get(key)
        if existing is None or (existing.name is None and package.name is not None):
            deduplicated[key] = package

    packages = sorted(deduplicated.values(), key=lambda item: (item.path != ".", item.path))

    pnpm = _pnpm_members(root)
    if pnpm:
        for package in packages:
            if package.path == "." and package.ecosystem == "node":
                package.members = package.members or pnpm
                package.is_workspace_root = True
    return packages


def configure(root: str) -> Environment:
    """Detects the repository's shape, then applies the manifest's declared overrides.

    Declared entries extend what detection found and can exclude paths detection picked up. A
    repository that declares nothing gets pure detection.

    Args:
        root: Absolute or relative path to the repository root.

    Returns:
        The configured environment.
    """
    root = os.path.abspath(root)
    manifest = _load_json(os.path.join(root, ".github", "darkfactory.json"))
    declared: Dict[str, Any] = manifest.get("environment", {}) or {}

    packages = detect(root)

    ignore = [str(pattern) for pattern in declared.get("ignore", [])]
    if ignore:
        packages = [
            package
            for package in packages
            if not any(fnmatch.fnmatch(package.path, pattern) for pattern in ignore)
        ]

    for entry in declared.get("packages", []) or []:
        path = str(entry.get("path", "."))
        ecosystem = str(entry.get("ecosystem", ""))
        existing = next(
            (p for p in packages if p.path == path and p.ecosystem == ecosystem),
            None,
        )
        if existing is not None:
            for field in ("name", "version", "manifest"):
                if entry.get(field):
                    setattr(existing, field, entry[field])
        else:
            packages.append(
                Package(
                    path=path,
                    ecosystem=ecosystem,
                    manifest=str(entry.get("manifest", "")),
                    name=entry.get("name"),
                    version=entry.get("version"),
                )
            )

    packages.sort(key=lambda item: (item.path != ".", item.path, item.ecosystem))
    return Environment(root=root, packages=packages, declared=declared)


def main() -> None:  # pragma: no cover - thin CLI wrapper
    """Prints the configured environment as JSON, for a workflow step to consume."""
    import argparse

    parser = argparse.ArgumentParser(description="Report the repository environment as JSON.")
    parser.add_argument("--repo-root", default=".", help="repository to inspect")
    args = parser.parse_args()
    print(json.dumps(configure(args.repo_root).as_dict(), indent=2))


if __name__ == "__main__":  # pragma: no cover
    main()
