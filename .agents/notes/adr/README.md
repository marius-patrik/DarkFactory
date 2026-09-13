# Architecture Decision Records

Numbered, append-only. An ADR is added when an open decision from `PRD.md` §13 is resolved, or when
any deviation from `PRD.md` is approved (`.agents/rules/003-product-requirements-and-adrs.md`).
One decision, one file: each discrete ADR in this directory.

Each record states the decision, the alternatives that were rejected **and why**, and what the
decision forecloses. "We chose X because it is better" is not an ADR.

**Status values:** `Proposed` (awaiting the maintainer's approval) · `Accepted` · `Superseded by
ADR-NNNN`. An ADR only binds the implementation once it is `Accepted`.

Numbering is per-file and sequential within this directory. `0001` is taken; the next decision is
`0006`. The deprecated `architecture_decisions.md` ledger that once held all records was split into
one file per decision on 2026-09-13 and removed; its four records became this directory's
`0002`–`0005`.