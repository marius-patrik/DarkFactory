# DarkFactory-Paper

Odborná práce **DarkFactory — Agentické a harnessové inženýrství: Umělá inteligence v praxi**. Repozitář obsahuje konceptově řízený Typst rukopis, publikační šablony, webový viewer a integrační bod praktického systému [DarkFactory](https://github.com/marius-patrik/DarkFactory).

## Multi-book architektura

Repozitář je jeden publikační projekt, který může obsahovat více samostatných knih. Každá kniha je top-level adresář s vlastním `book.typ`; aktuální kniha je `DarkFactory/`.

`DarkFactory/` je plně soběstačný book root a vlastní:
- strukturální strom konceptů a celý rukopis,
- metadata a titulní kompozici,
- `templates/`,
- `fonts/`,
- `bib/`,
- `img/`,
- PDF a sémantický web renderer.

Kořenové `main.typ`, `review.typ` a `web-publication.typ` jsou pouze obecné dispatchery přes `books.typ`. Druhá kniha se přidá jako sourozenecký book root se stejným kontraktem a zaregistruje se v `books.typ`.

Hlavní název knihy je součást struktury: `DarkFactory/index.typ` deklaruje kořenový folder `DarkFactory` a z něj se odvozuje book title používaný titulní stranou i webovou publikací. Název proto není paralelně udržován v repository-global metadata.

## Struktura rukopisu

Folder manifesty `index.typ` jsou jediným zdrojem sekční hierarchie. Každý folder může určit svůj section concept, přímé koncepty a child folders. Vnoření folderů přímo vytváří vnoření sekcí; samostatná chapter vrstva neexistuje.

Kanonický katalog aktuální knihy začíná v `DarkFactory/index.typ`. Koncepty vlastní:
- stabilní `key`,
- kanonickou terminologii, volitelný alias a `keyword` příznak,
- textová pole přesně `definition` a `description`,
- zdrojová/citační metadata, `examples` a `attachments`,
- semantic relations `dependency` a `related`.

`keyword` má výchozí hodnotu `false`; pouze ručně vybrané hlavní pojmy používají `keyword: true` a zobrazují se v seznamu klíčových slov. Section koncepty a přímé koncepty se vykreslují jako nadpisy; úrovně 1–3 jsou číslované, úroveň 4 a hlubší zůstává v obsahu bez čísla sekce a obsah používá explicitní odsazení podle úrovně. Folder může výjimečně dodat čistě prezentační `title`, aniž by měnil kanonickou terminologii konceptu. Příklady zůstávají samostatnými konceptovými záznamy se svou terminologií, citacemi a obrazovými zdroji; vizuální příklady se uvnitř rodiče vykreslují pouze svým popisem a obrázkem, ostatní inline příklady zachovávají termín a definici. Teoretická a praktická část jsou odvozeny z folderové struktury, nikoli z paralelních polí na jednotlivých konceptech.

## Terminologie

Kanonická terminologie je vlastností samotného konceptu:

- `industry` — zavedený oborový termín nebo zkratka,
- `czech` — český formální název,
- `english` — anglický formální název,
- `alias` — volitelný skutečný alternativní název.

Plný povrch termínu vede oborovým termínem a podle potřeby doplňuje český název v kulatých závorkách, anglický název v hranatých závorkách a volitelný alias; duplicitní vrstvy se potlačují. Stejný kanonický povrch používají odkazy v textu i sekční názvy.

## Publikace

Publikace má jedinou obsahovou variantu a dva review stavy:

| Stav | PDF | HTML | Markdown |
| --- | --- | --- | --- |
| Final | `out/prace.pdf` | `out/prace.html` | `out/prace.md` |
| Review | `out/prace-review.pdf` | `out/prace-review.html` | `out/prace-review.md` |

PDF je kanonický paged/print výstup; HTML a Markdown jsou odvozené publikační artefakty stejného rukopisu.

## Build

Výchozí kniha je `DarkFactory`:

```bash
make all
make ci
make site
```

Book root lze zvolit explicitně:

```bash
make all BOOK=DarkFactory
make all-templates BOOK=DarkFactory
make template-check BOOK=DarkFactory
make watch BOOK=DarkFactory
```

`make all-books` projde všechny top-level adresáře s `book.typ` a sestaví jejich kompletní publikační výstupy do `out/books/<book>/`.

Typst používá fonty z `<book>/fonts/`; pro DarkFactory tedy `DarkFactory/fonts/`.

## Review workflow

Rukopis používá jediný source of truth. Review build zapíná Typst review state:
- `#diff[old][proposal]` pro návrh změny,
- `#unconfirmed` pro neověřený text,
- `#accepted` a `#finalized` pro přijatý/finalizovaný text,
- callouty pro návrhy, chyby, strukturální upozornění a kritiku.

Final výstup zachovává pouze aktuálně přijatou stranu review stavu.

## Webový viewer

`web/` je React + TypeScript aplikace sestavovaná přes Rsbuild/Rspack a kontrolovaná Biome.

Aktuální shell používá:
- sjednocený **Structure** sidebar, který v pořadí dokumentu prokládá section headings a stránky,
- **Explorer** pro repozitářové soubory,
- persistentní a resizable sidebar,
- activity bar vlevo/vpravo/nahoře/dole,
- Dockview workspace s draggable tabs a libovolnými horizontálními/vertikálními split konfiguracemi,
- renderer select **View / Review / Raw**,
- kompaktní status selektor file type,
- File/View menubar,
- Appearance menu s Light / Dark / OLED,
- PDF.js text a annotation layers, interní PDF navigaci, zoom a selectable text.

`make web-check` spustí Biome lint, TypeScript typecheck a produkční Rsbuild build.

## Repository map

| Cesta | Účel |
| --- | --- |
| `books.typ` | statický registry knih |
| `main.typ` | generický PDF entrypoint |
| `review.typ` | generický Review PDF entrypoint |
| `web-publication.typ` | generický sémantický web entrypoint |
| `DarkFactory/book.typ` | rozhraní knihy DarkFactory |
| `DarkFactory/index.typ` | top-level strukturální root a katalog |
| `DarkFactory/schema.typ` | concept/folder/relation/render model |
| `DarkFactory/manuscript/` | document-level struktura |
| `DarkFactory/development-environment/` | doménové koncepty |
| `DarkFactory/language-models/` | koncepty jazykového modelu |
| `DarkFactory/agentic-engineering/agent-harness/` | agentní harness a jeho přímé runtime koncepty |
| `DarkFactory/agentic-engineering/` | agentické a harnessové inženýrství |
| `DarkFactory/templates/` | book-local Typst semantics a layouts |
| `DarkFactory/fonts/` | book-local fonty |
| `DarkFactory/bib/` | book-local bibliografie |
| `DarkFactory/img/` | book-local vizuální assety |
| `web/` | publikační viewer |
| `scripts/` | build/export/site validace |
| `darkfactory/` | jediný git submodule, praktický agentní harness |

## Implementační repozitář

`darkfactory/` je jediný submodule a ukazuje na repozitář [marius-patrik/DarkFactory](https://github.com/marius-patrik/DarkFactory).

Publikované výstupy: <https://marius-patrik.github.io/DarkFactory-Paper/>
