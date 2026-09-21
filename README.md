# DarkFactory-Paper

Odborná práce **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.

Repozitář obsahuje konceptově řízený Typst rukopis, publikační šablony, webový viewer a submodule praktického systému [DarkFactory](https://github.com/marius-patrik/DarkFactory).

## Rukopis

Kanonická struktura začíná v `DarkFactory/index.typ`. Folder manifesty `index.typ` jsou jediným zdrojem hierarchie.

Hlavní struktura:

1. Úvod
2. Teoretická část
   - Software Engineering
   - LLM
   - Harness
   - Agentic Engineering
     - Harness Engineering
3. Praktická část
   - Úvod
   - Architektura DarkFactory
   - Výsledky a diskuse
4. Závěr

Koncept vlastní svůj stabilní klíč, terminologii, definici, popis, citace, příklady a semantic relations. Plný termín vede oborovým termínem, následuje český název v závorkách a odlišný anglický název v hranatých závorkách.

## Publikace

| Stav | PDF | HTML | Markdown |
| --- | --- | --- | --- |
| Final | `out/prace.pdf` | `out/prace.html` | `out/prace.md` |
| Review | `out/prace-review.pdf` | `out/prace-review.html` | `out/prace-review.md` |

PDF je kanonický paged/print výstup. HTML a Markdown jsou odvozené artefakty stejného rukopisu.

## Build

```bash
make all BOOK=DarkFactory
make web-check
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

## Repository map

| Cesta | Účel |
| --- | --- |
| `DarkFactory/index.typ` | strukturální root a název práce |
| `DarkFactory/schema.typ` | concept/folder/relation/render model |
| `DarkFactory/manuscript/` | dokumentová struktura, praktická část a výsledky |
| `DarkFactory/software-engineering/` | Software Engineering |
| `DarkFactory/language-models/` | LLM a související koncepty |
| `DarkFactory/agentic-engineering/` | Harness, Agentic Engineering a Harness Engineering |
| `DarkFactory/bib/` | bibliografie |
| `DarkFactory/img/` | obrázky |
| `DarkFactory/templates/` | Typst semantics a layouty |
| `web/` | React/TypeScript viewer |
| `scripts/` | build/export/site validace |
| `darkfactory/` | praktický DarkFactory submodule |

Pravidla pro budoucí agentské úpravy jsou v `AGENTS.md`.
