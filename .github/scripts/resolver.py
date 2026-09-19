import os


def resolve_df_file(root: str, name: str) -> str:
    """Resolves a .df file path with precedence: .darkfactory/<name>.df then <name>.df.

    Args:
        root: The repository root directory.
        name: The base name of the file (e.g., 'repo', 'config').

    Returns:
        The path to the .df file.

    Raises:
        ValueError: If both locations exist or neither exists.
    """
    df_path = os.path.join(root, ".darkfactory", f"{name}.df")
    root_path = os.path.join(root, f"{name}.df")

    df_exists = os.path.exists(df_path)
    root_exists = os.path.exists(root_path)

    if df_exists and root_exists:
        raise ValueError(f"Both {df_path} and {root_path} exist; only one is allowed.")

    if df_exists:
        return df_path
    if root_exists:
        return root_path

    raise ValueError(
        f"{name}.df not found in {root} (checked .darkfactory/{name}.df and {name}.df)"
    )
