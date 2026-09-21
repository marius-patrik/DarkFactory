# DarkFactory book root

`DarkFactory/` je kompletní book root práce **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.

## Structural contract

- `index.typ` folder manifesty jsou jediným zdrojem sekční hierarchie.
- Koncepty vlastní terminologii, `definition`, `description`, citace, příklady, attachments a semantic relations.
- Section headings používají stejný canonical term surface jako odkazy v textu.
- Levels 1–3 jsou číslované; level 4+ zůstává v obsahu, ale bez čísla.
- Relations `dependency` a `related` nevytvářejí containment.
- `manuscript/` vlastní pouze document-level strukturu, praktickou část, výsledky, závěr a appendices.
- `agentic-engineering/harness-engineering/` je child section Agentic Engineering.
- Praktická část neobsahuje Harness Engineering; popisuje DarkFactory a doložitelné výsledky.

## Terminology

Canonical full surface:
1. `industry`,
2. `czech` v kulatých závorkách,
3. odlišné `english` v hranatých závorkách,
4. volitelné odlišné `alias`.

Příklad: **Session (Agentní sezení) [Agent Session]**.

## Book-owned resources

`DarkFactory/` vlastní `templates/`, `fonts/`, `bib/`, `img/`, `metadata.typ`, `thesis.typ`, `web-publication.typ` a `book.typ`.

Podrobné psací, citační a validační instrukce jsou v kořenovém `AGENTS.md`.
