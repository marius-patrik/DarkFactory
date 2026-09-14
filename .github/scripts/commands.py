"""One shared command grammar for issue gates and pull request approvals.

The issue gates in :mod:`agent_runner` and the merge gate in
:mod:`handle_pr_approval` each used to own their own approval regex, so a command the
owner decided (``/df approve``) worked on neither. Everything approval-shaped is parsed
here; both scripts import this module instead of keeping a private copy.

Strict commands (case-insensitive)::

    /df approve | /df reject | /df revise | /df resume
    /approve    | /reject    | /revise    | /resume

``revise`` is an alias of ``reject`` and parses as ``"reject"``.

Approvals and resumes must stand alone as the whole comment: a decision stays
distinguishable from a discussion. A rejection instead routes the stage back with the
comment as feedback, so it accepts trailing text — ``/df reject use bun, not npm`` —
which :func:`command_feedback` returns; :func:`parse_command` still reports ``"reject"``.

Legacy bare words keep working so nothing in use breaks. On issues: ``approve``,
``/approve``, ``lgtm``, ``good`` count as approval and ``resume``, ``/resume`` as
resume. On pull requests: ``approve``, ``/approve``, ``merge``, ``/merge``, ``lgtm``
count as approval. Anything else — including a sentence that merely contains one of
these words (``I do not approve yet``) — parses as ``None``; :func:`is_command_hint`
reports those mentions so the caller can post a one-time hint instead of acting.
"""

import re
from typing import Dict, Optional

#: Strict `/df <verb>` or `/<verb>` command standing alone as the whole comment.
STRICT_COMMAND = re.compile(r"(?i)^\s*(?:/df\s+|/)(approve|reject|revise|resume)\s*$")

#: Strict rejection with trailing feedback (`/df reject use bun, not npm`). Approvals and
#: resumes never take trailing text; a rejection routes the stage back, so the reason rides
#: along. The word boundary keeps prose like "rejected" or "/revision" from matching.
STRICT_REJECT_WITH_FEEDBACK = re.compile(r"(?i)^\s*(?:/df\s+|/)(?:reject|revise)\b\s*(.*?)\s*$")

#: Legacy whole-comment approvals that predate the strict grammar, per surface.
LEGACY_ISSUE_COMMANDS: Dict[str, str] = {
    "approve": "approve",
    "/approve": "approve",
    "lgtm": "approve",
    "good": "approve",
    "resume": "resume",
    "/resume": "resume",
}

#: Legacy whole-comment approvals that predate the strict grammar, per surface.
LEGACY_PR_COMMANDS: Dict[str, str] = {
    "approve": "approve",
    "/approve": "approve",
    "merge": "approve",
    "/merge": "approve",
    "lgtm": "approve",
}

#: Whole-comment approval matcher for issues (strict grammar plus legacy words).
ISSUE_COMMAND_RE = re.compile(
    r"(?i)^\s*(?:/df\s+approve|/approve|approve|lgtm|good|/df\s+resume|/resume|resume)\s*$"
)

#: Whole-comment approval matcher for pull requests (strict grammar plus legacy words).
PR_COMMAND_RE = re.compile(r"(?i)^\s*(?:/df\s+approve|/approve|approve|merge|/merge|lgtm)\s*$")

#: Words whose mere mention (outside a command) earns at most a one-time hint.
HINT_WORDS = re.compile(r"(?i)\b(approve(?:d)?|lgtm|merge|resume|revise|reject)\b")

#: Marker left on the hint comment so it is posted at most once per issue.
HINT_MARKER = "<!-- darkfactory-command-hint -->"

#: Associations allowed to approve: the Request author or a privileged role, never a bot.
ALLOWED_ASSOCIATIONS = frozenset({"OWNER", "MEMBER", "COLLABORATOR"})


def _strict_verb(body: str) -> Optional[str]:
    """Parses the strict `/df <verb>` / `/<verb>` grammar.

    Args:
        body: Comment body.

    Returns:
        ``"approve"``, ``"reject"`` (``revise`` normalises to this, trailing
        feedback allowed), ``"resume"``, or ``None``.
    """
    text = body.strip() if body else ""
    match = STRICT_COMMAND.match(text)
    if match:
        verb = match.group(1).lower()
        return "reject" if verb == "revise" else verb
    if STRICT_REJECT_WITH_FEEDBACK.match(text):
        return "reject"
    return None


def command_feedback(body: str) -> str:
    """Extracts the trailing reason from a rejection command.

    Args:
        body: Comment body.

    Returns:
        The feedback text (``""`` for a bare ``/df reject`` or a non-rejection).
    """
    text = (body or "").strip()
    match = STRICT_REJECT_WITH_FEEDBACK.match(text)
    if not match or parse_command(text) != "reject":
        return ""
    feedback = match.group(1).strip()
    return feedback.lstrip(":.-").strip()


def parse_command(body: str, surface: str = "issue") -> Optional[str]:
    """Parses one comment into a pipeline command.

    Args:
        body: Comment body.
        surface: ``"issue"`` for Request/Plan gates, ``"pr"`` for pull requests.

    Returns:
        ``"approve"``, ``"reject"``, ``"resume"``, or ``None`` when the body is not
        a command — including free text that merely mentions a command word.
    """
    text = (body or "").strip()
    if not text:
        return None
    verb = _strict_verb(text)
    if verb is not None:
        return verb
    legacy = LEGACY_PR_COMMANDS if surface == "pr" else LEGACY_ISSUE_COMMANDS
    return legacy.get(text.lower())


def parse_issue_command(body: str) -> Optional[str]:
    """Parses a comment on a Request/Plan issue into a pipeline command.

    Args:
        body: Comment body.

    Returns:
        ``"approve"``, ``"reject"``, ``"resume"``, or ``None``.
    """
    return parse_command(body, surface="issue")


def parse_pr_command(body: str) -> Optional[str]:
    """Parses a comment on a pull request into a pipeline command.

    Args:
        body: Comment body.

    Returns:
        ``"approve"`` for an approval (strict or legacy ``merge``/``lgtm``),
        ``"reject"``, ``"resume"``, or ``None``.
    """
    return parse_command(body, surface="pr")


def is_command_hint(body: str) -> bool:
    """Reports whether a non-command body mentions a command word.

    Such bodies trigger at most a one-time hint comment — never a gate transition.

    Args:
        body: Comment body.

    Returns:
        True when the body is not a command on either surface but mentions one of
        the command words.
    """
    text = (body or "").strip()
    if not text:
        return False
    if parse_issue_command(text) is not None or parse_pr_command(text) is not None:
        return False
    return bool(HINT_WORDS.search(text))


def is_bot_login(login: str) -> bool:
    """Reports whether a login belongs to automation rather than a person.

    Args:
        login: GitHub login.

    Returns:
        True for ``[bot]`` accounts and the well-known automation logins.
    """
    if not login:
        return True
    lowered = login.lower()
    return lowered.endswith("[bot]") or lowered in {
        "github-actions",
        "app/github-actions",
        "dependabot",
    }


def is_allowed_approver(
    actor: str,
    author_association: str = "",
    issue_author: str = "",
    user_type: str = "",
) -> bool:
    """Reports whether a commenter may approve, reject, or resume.

    Owner decision 9c: the Request author or an OWNER/MEMBER/COLLABORATOR
    (``author_association``), never a bot account.

    Args:
        actor: Login of the commenter or reviewer.
        author_association: Their ``author_association`` on the commented item.
        issue_author: Login of the Request author (issue/PR author for the gate).
        user_type: GitHub ``user.type`` (``"Bot"`` never passes).

    Returns:
        True when the actor's command counts as a gate decision.
    """
    if not actor or is_bot_login(actor):
        return False
    if (user_type or "").lower() == "bot":
        return False
    if (author_association or "").upper() in ALLOWED_ASSOCIATIONS:
        return True
    return bool(issue_author) and actor.lower() == issue_author.lower()
