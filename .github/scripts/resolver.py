import os


LEGACY_PATHS = [
    ".darkfactory/manifest.json",
    ".darkfactory/df/config.json",
    ".github/darkfactory.json",
]


def resolve_df_file(root: str, name: str) -> str:
    """Resolves a .df file path with precedence: .darkfactory/<name>.df then <name>.df.

    Args:
        root: The repository root directory.
        name: The base name of the file (e.g., 'repo', 'config').

    Returns:
        The path to the .df file.

    Raises:
        ValueError: If both locations exist or a legacy path is present.
    """
    df_path = os.path.abspath(os.path.join(root, ".darkfactory", f"{name}.df"))
    root_path = os.path.abspath(os.path.join(root, f"{name}.df"))

    # Hard cutover: legacy paths must never be read.
    for legacy in LEGACY_PATHS:
        legacy_full = os.path.join(root, legacy)
        if os.path.exists(legacy_full):
            raise ValueError(
                f"Legacy path '{legacy}' is no longer supported. "
                f"Use '{name}.df' at one of: '{df_path}' or '{root_path}'."
            )

    df_exists = os.path.exists(df_path)
    root_exists = os.path.exists(root_path)

    if df_exists and root_exists:
        raise ValueError(f"Both {df_path} and {root_path} exist; only one is allowed.")

    if df_exists:
        return df_path
    if root_exists:
        return root_path

    # Neither exists - return primary path so callers can create it or test with it.
    return df_path
