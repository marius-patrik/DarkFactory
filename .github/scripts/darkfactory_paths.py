import os

# Legacy paths that must never be read.
LEGACY_PATHS = [
    ".darkfactory/manifest.json",
    ".darkfactory/df/config.json",
    ".github/darkfactory.json",
]


def repo_file(name: str, repo_root: str = ".") -> str:
    """Resolve the canonical path for a repository file.

    Precedence:
      1. `.darkfactory/<name>` (the new location)
      2. `<repo_root>/<name>` (the fallback location)

    If both locations exist, a ``FileExistsError`` is raised naming both paths.
    Legacy paths are never read; if any exist, a ``FileNotFoundError`` is raised
    naming the new location so the repository can be migrated.
    If neither location exists, the primary path is returned so callers can create it.
    """
    root = os.path.abspath(repo_root)
    primary = os.path.abspath(os.path.join(root, ".darkfactory", name))
    fallback = os.path.abspath(os.path.join(root, name))

    # Hard transition: legacy paths must never be read.
    for legacy in LEGACY_PATHS:
        legacy_path = os.path.join(root, legacy)
        if os.path.exists(legacy_path):
            raise FileNotFoundError(
                f"Legacy path '{legacy}' is no longer supported. "
                f"Use '{name}' at one of: '{primary}' or '{fallback}'."
            )

    primary_exists = os.path.exists(primary)
    fallback_exists = os.path.exists(fallback)

    if primary_exists and fallback_exists:
        raise FileExistsError(
            f"conflicting repo files for '{name}': both exist: '{primary}' and '{fallback}'"
        )

    if primary_exists:
        return primary

    if fallback_exists:
        return fallback

    # Neither exists – return the primary path so callers can create it.
    return primary
