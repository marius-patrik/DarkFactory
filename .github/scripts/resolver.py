"""Resolves and reads DarkFactory's combined configuration document."""

import json
import os
from typing import Any, Dict, Literal, Mapping, Optional

ConfigBlock = Literal["repo", "docs", "providers"]
CONFIG_FILENAMES = ("repo.dfconfig", "config.dfconfig", ".dfconfig")
DEFAULT_CONFIG_DIR = ".darkfactory"


def _config_directory(root: str, env: Mapping[str, str]) -> str:
    """Returns the configured fallback directory for a repository root."""
    configured = env.get("DF_CONFIG_DIR", "").strip() or DEFAULT_CONFIG_DIR
    repository_root = os.path.abspath(root)
    if os.path.isabs(configured):
        abs_configured = os.path.abspath(configured)
        try:
            common = os.path.commonpath([repository_root, abs_configured])
            if common == repository_root:
                return abs_configured
        except ValueError:
            pass
        return os.path.join(repository_root, DEFAULT_CONFIG_DIR)
    return os.path.normpath(os.path.join(repository_root, configured))


def _candidates(directory: str) -> list[str]:
    """Returns configuration candidates that exist in one scope."""
    return [
        os.path.join(directory, name)
        for name in CONFIG_FILENAMES
        if os.path.exists(os.path.join(directory, name))
    ]


def resolve_config_document_path(
    root: str,
    env: Optional[Mapping[str, str]] = None,
) -> str:
    """Resolves the one combined configuration document selected for a repository.

    Root candidates are selected when present, otherwise candidates from ``DF_CONFIG_DIR`` are
    selected. More than one candidate across either scope is an ambiguity and is rejected.

    Args:
        root: Repository root directory.
        env: Environment mapping; defaults to the process environment.

    Returns:
        The selected path, or the default ``<DF_CONFIG_DIR>/repo.dfconfig`` path when none exists.
    """
    repository_root = os.path.abspath(root)
    config_directory = _config_directory(repository_root, os.environ if env is None else env)
    root_candidates = _candidates(repository_root)
    folder_candidates = [] if config_directory == repository_root else _candidates(config_directory)

    if root_candidates and folder_candidates:
        raise ValueError(
            "Ambiguous DarkFactory configuration: candidates exist in both the repository root "
            f"({', '.join(root_candidates)}) and {config_directory} ({', '.join(folder_candidates)}); "
            "remove all but one config.dfconfig, repo.dfconfig, or .dfconfig location."
        )
    candidates = root_candidates or folder_candidates
    if len(candidates) > 1:
        scope = repository_root if root_candidates else config_directory
        raise ValueError(
            f"Ambiguous DarkFactory configuration aliases in {scope}: {', '.join(candidates)}; "
            "keep only repo.dfconfig, config.dfconfig, or .dfconfig."
        )
    return candidates[0] if candidates else os.path.join(config_directory, CONFIG_FILENAMES[0])


def load_config_block(
    root: str,
    block: ConfigBlock,
    default: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Loads one semantic block from the selected combined configuration.

    Args:
        root: Repository root directory.
        block: Block selected by the consumer.
        default: Value returned when the document or block is absent.

    Returns:
        The selected block, or ``default`` when absent.

    Raises:
        ValueError: If discovery is ambiguous or the selected document/block is malformed.
    """
    if block not in ("repo", "docs", "providers"):
        raise ValueError(f"Unknown DarkFactory configuration block: {block}")
    path = resolve_config_document_path(root)
    if not os.path.isfile(path):
        return {} if default is None else default
    try:
        with open(path, encoding="utf-8") as handle:
            document = json.load(handle)
    except (OSError, json.JSONDecodeError) as exc:
        raise ValueError(f"Invalid DarkFactory configuration JSON at {path}: {exc}") from exc
    if not isinstance(document, dict):
        raise ValueError(f"DarkFactory configuration at {path} must contain an object.")
    value = document.get(block)
    if value is None:
        return {} if default is None else default
    if not isinstance(value, dict):
        raise ValueError(
            f"DarkFactory configuration block {block} at {path} must contain an object."
        )
    return value
