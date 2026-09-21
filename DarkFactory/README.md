# DarkFactory book root

`DarkFactory/` je kompletní book root práce **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.

## Structural contract

- Folder manifesty `index.typ` jsou jediným zdrojem číslované dokumentové hierarchie.
- Folder/section je strukturální seskupení; concept je samostatný sémantický termín nebo mechanismus.
- Sekce jsou číslované a koncepty nečíslované; obojí zůstává viditelné v obsahu.
- Koncepty vlastní terminologii, `definition`, `description`, citace, příklady, attachments a semantic relations.
- Relations `dependency`, `related`, `parent` a `child` patří do sémantického grafu a nenahrazují dokumentovou hierarchii.
- `manuscript/` vlastní document-level strukturu, Praktickou část, Results, Závěr a appendices.
- `software-engineering/`, `language-models/` a `agentic-engineering/` vlastní teoretické koncepty.
- Harness je samostatná teoretická oblast pod `agentic-engineering/agent-harness/`; samostatný koncept ani sekce **Harness Engineering** neexistuje.
- Praktická část popisuje pouze doložitelnou implementaci DarkFactory a její výsledky.
- Appendix **Encyklopedie a rejstřík pojmů** i front-matter **Klíčová slova** vznikají ze stejných konceptů označených `keyword: true`.

## Terminology

Canonical full surface:

1. `industry`,
2. odlišné `czech` v kulatých závorkách,
3. odlišné `english` v hranatých závorkách,
4. volitelné skutečně odlišné `alias`.

Příklad: **Session (Agentní sezení) [Agent Session]**.

Strukturální nadpisy jsou české, pokud nebyl výslovně uzamčen ustálený industry/proper název. Podrobná kanonická taxonomie je v kořenovém `AGENTS.md`.

## Book-owned resources

`DarkFactory/` vlastní `templates/`, `fonts/`, `bib/`, `img/`, `metadata.typ`, `thesis.typ`, `web-publication.typ` a `book.typ`.

Podrobné psací, citační, výzkumné a validační instrukce jsou v kořenovém `AGENTS.md`; `PLAN.md` obsahuje pouze konečný postup dokončení práce.
