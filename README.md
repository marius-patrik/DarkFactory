# DarkFactory-Paper

Odborná práce **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.

Repozitář obsahuje konceptově řízený Typst rukopis, publikační šablony, webový viewer a submodule praktického systému [DarkFactory](https://github.com/marius-patrik/DarkFactory).

## Rukopis

Kanonická struktura začíná v `DarkFactory/index.typ`. Folder manifesty `index.typ` jsou jediným zdrojem dokumentové hierarchie.

Struktura rozlišuje dvě vrstvy:

- **sekce** — foldery, které organizují argument práce; renderují se číslovaně a jsou v obsahu;
- **koncepty** — termíny a mechanismy; renderují se nečíslovaně a jsou rovněž v obsahu.

Hlavní struktura:

1. Úvod
2. Teoretická část
   - Software Engineering
   - Model
   - Harness
   - Agentic Engineering
3. Praktická část
   - Úvod
   - Návrh systému DarkFactory
   - Životní cyklus požadavku
   - Výsledky a diskuse
4. Závěr

Theory používá grouping sections pro AI-asistovaný vývoj, specifikaci a plánování, řízení změn, verifikaci, modelový kontext, stav a runtime harnessu, kontextové mechanismy, řízení provádění a multi-agentní systémy.

Kanonický koncept vlastní stabilní klíč, terminologii, definici, popis, citace, příklady a semantic relations. Plný název konceptu vede ustáleným industry termem, následuje odlišný český název v závorkách a odlišný anglický formální název v hranatých závorkách. Bez samostatného industry termu vede český název.

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
| `DarkFactory/schema.typ` | section/concept/folder/relation/render model |
| `DarkFactory/manuscript/` | dokumentová struktura, praktická část a výsledky |
| `DarkFactory/software-engineering/` | Software Engineering |
| `DarkFactory/language-models/` | Model a modelové koncepty |
| `DarkFactory/agentic-engineering/` | Harness a Agentic Engineering |
| `DarkFactory/bib/` | bibliografie |
| `DarkFactory/img/` | obrázky |
| `DarkFactory/templates/` | Typst semantics a layouty |
| `web/` | React/TypeScript viewer |
| `scripts/` | build/export/site validace |
| `darkfactory/` | praktický DarkFactory submodule |

`AGENTS.md` obsahuje trvalá pravidla. `PLAN.md` obsahuje pouze konečný postup dokončení práce.
