# Odborná práce — DarkFactory: Umělá inteligence v praxi – Agentické a harnessové inženýrství

> Odborná práce na Gymnáziu J. K. Tyla. Autor: **Patrik Marius**, 4.D.
> Vedoucí práce: **Michal Dočekal**. Rok: **2026**.

Práce se zabývá návrhem a realizací autonomního systému pro vývoj softwaru.
Praktickou částí je systém [DarkFactory](https://github.com/marius-patrik/DarkFactory),
který práci zároveň sází, testuje a publikuje.

## Repozitářová architektura

Aktivní architektura má pouze dva repozitáře:

- **DarkFactory-Paper** — rukopis, sazba, interní Typst šablona a integrační bod praktické části.
- **DarkFactory** — vlastní agentní harness; v tomto repozitáři je připojen jako jediný submodule `darkfactory/`.

Dřívější `OdbornaPrace-mono` wrapper už není potřeba. Samostatná šablona byla
přesunuta dovnitř práce jako `templates/gjkt-odborna-prace/`, takže sazba a
rukopis se nemohou verzově rozcházet.

## Dokumentové šablony

Výchozí šablona je `gjkt-odborna-prace`. Sdílené autorské/review funkce a jazykový stav žijí v `templates/common.typ`; `templates/registry.typ` vybírá konkrétní dokumentovou šablonu. Každá šablona žije v `templates/<name>/` a exportuje funkci `template(...)[body]`, takže konkrétní sazbu lze přepnout bez kopírování textu nebo review logiky.

```bash
make all TEMPLATE=gjkt-odborna-prace
make all-templates
make template-check
```

`make all-templates` kompiluje všech osm profil/review variant pro každou nalezenou šablonu do `out/templates/<template>/`. `make ci` tuto plnou matici spouští automaticky a ověřuje také oddělení `common`/registry/template vrstev.

## Publikační profily

Celá práce používá jediný rukopis a volitelnou dokumentovou šablonu: `main.typ -> thesis() -> templates/registry.typ -> template(...)`.
Výstup určuje pouze publikační profil a přepínač review:

| Profil | Final | Review | Účel |
| :--- | :--- | :--- | :--- |
| `school` | `out/prace.pdf` | `out/prace-review.pdf` | výchozí školní česká verze; anglické odborné termíny, bilingvní anotace a keywords |
| `cs` | `out/prace-cs.pdf` | `out/prace-cs-review.pdf` | čistě česká projekce |
| `en` | `out/prace-en.pdf` | `out/prace-en-review.pdf` | anglická projekce |
| `merged` | `out/prace-bilingual.pdf` | `out/prace-bilingual-review.pdf` | sloučená česko-anglická projekce |

Jazykové projekce jsou zdrojově řízené. Části, které zatím nejsou zapsané pomocí
bilingvních helperů, zůstávají ve svém původním jazyce; infrastruktura tedy nepředstírá
automatický překlad.

## Sazba a kontrola

```bash
brew install typst
make watch      # živý náhled školního final profilu
make build      # všechny 4 final profily
make review     # všechny 4 review profily
make all        # všech 8 PDF
make ci         # 8 PDF výchozí šablony + plná 8×N matice všech šablon + kontrola architektury
make site       # sestaví PDF a lokální podobu GitHub Pages
```

CI používá stejný `make ci` kontrakt. Job `ci / paper` kompiluje kanonických osm variant výchozí šablony i úplnou matici všech registrovaných šablon, kontroluje PDF artefakty, architekturu šablon a release manifest. Release workflow spouští stejnou validaci před zabalením kanonických osmi assetů.

Písma jsou přibalena v `fonts/`, takže výsledek je reprodukovatelný bez systémové
závislosti na konkrétní instalaci písem.

## GitHub Pages

Pages web publikuje všechny dokumentové šablony a pod každou všech osm profile/review variant. Primární odkazy otevírají vlastní statický dokumentový viewer v `web/`, který používá PDF.js nad přesným PDF výstupem Typstu; přímé PDF zůstává dostupné pro stažení a jako fallback.

<https://marius-patrik.github.io/DarkFactory-Paper/>

## Struktura

| Cesta | Účel |
| :--- | :--- |
| `main.typ` | jediný kanonický compiler entrypoint |
| `thesis.typ` | společné sestavení obsahu práce |
| `metadata.typ` | název, autor, škola, anotace a jazykové varianty metadata |
| `kapitoly/*.typ` | text práce |
| `templates/common.typ` | sdílená autorská/review API, jazykové profily a terminologie |
| `templates/registry.typ` | registry a výběr dokumentové šablony |
| `templates/gjkt-odborna-prace/` | GJKT struktura dokumentu, sazba a počítání rozsahu |
| `scripts/check_build.py` | statická CI kontrola osmi PDF a release assetů |
| `scripts/build_site.py` | generátor Pages selectoru |
| `bib/references.bib` | zdroje ve formátu BibTeX |
| `img/` | obrázky včetně loga školy |
| `darkfactory/` | jediný git submodule; praktická část DarkFactory |

## Odkazy

| | |
| :--- | :--- |
| Publikované verze | <https://marius-patrik.github.io/DarkFactory-Paper/> |
| Vydané verze | [Releases](https://github.com/marius-patrik/DarkFactory-Paper/releases) |
| Šablona | interní šablona `templates/gjkt-odborna-prace/` |
| Praktická část | [`DarkFactory`](https://github.com/marius-patrik/DarkFactory) |


## Terminologie a překlady

Překládaný obsah používá sdílené datové hodnoty namísto paralelních polí a ručně
duplikovaného formátování. Anotace je uložena jako jediná bilingvní hodnota a šablona
ji vykresluje ve stejné sekční komponentě jako dynamický přehled klíčových slov.

Kanonické odborné pojmy jsou definovány pouze jednou v `templates/terms.typ` pomocí
`define-term(...)` a v rukopisu se používají přes `terms.<id>`.

CI kontroluje unikátnost stabilních term `id` a povinné jádro terminologie. Již
existující termy zůstávají kanonické (např. `language_model` pro LLM,
`skills` pro Skill a `plugins` pro Plugin); nové koncepty se nepřidávají jako
paralelní duplicity pod jinými identitami.

```typ
#term(terms.harness)
#term(terms.harness, render: "explanation", detail-language: "cs")
#term(terms.harness, render: "both", detail-language: "cs", detail-style: "inline")
```

Každý termín může mít dvě pojmenovací vrstvy:
- `proper` — formální/úplný název, samostatně pro češtinu a angličtinu,
- `industry` — běžná průmyslová zkratka nebo zažitý anglický název.

Všechny termíny používají jediný kanonický formát názvu **Čeština [English] (Industry)**.
Anglický proper název je v bilingvním zobrazení vždy v hranatých závorkách a industry
název či zkratka vždy v kulatých závorkách. Duplicitní vrstvy se automaticky potlačí:
například `language_model` se vykreslí jako `Jazykový model [Large Language Model] (LLM)`,
zatímco termín se shodným českým a anglickým názvem neopakuje stejný text dvakrát.

Renderer podporuje:
- `render: "term" | "explanation" | "both"`,
- nezávislé `name-language` a `detail-language`,
- `detail-order` a inline nebo skládaný detail,
- automatickou registraci skutečně použitých termínů do sekce klíčových slov.

Historické parametry pro změnu formátu názvu (`name-type`, `name-order`,
`name-separator`, `name-type-separator`) zůstávají pouze kvůli kompatibilitě
existujícího zdroje; vizuální formát termínu již nemění.


## Webový viewer

GitHub Pages je samostatná React + TypeScript aplikace v `web/`, sestavovaná přes Vite.
UI používá shadcn/ui (Radix primitives + Tailwind), Motion pro přechody a Dagre pro
layout minimapy stránek. PDF z Typstu zůstává kanonickým tiskovým a školním výstupem;
PDF.js nad ním renderuje canvas, textovou vrstvu i annotation vrstvu, takže text
zůstává označitelný/kopírovatelný a PDF odkazy jsou interaktivní. Interní PDF
destinace vlastní annotation link service překládá přímo na navigaci mezi stránkami
custom vieweru. Nad PDF.js callbacky je navíc capture-phase fallback navázaný přímo
na data jednotlivých anotací, takže interní cíle i externí URL zůstávají klikatelné.

Stejný rukopis se publikuje také jako skutečný kompilovaný HTML a Markdown. HTML vzniká
z odděleného sémantického vstupu `web-publication.typ` nativním HTML targetem Typstu
(`typst compile --features html --format html`). Markdown se poté deterministicky
odvozuje ze vzniklého HTML pomocí `scripts/build_web_exports.py`; nevzniká nezávislým
paralelním přepisem zdroje ani rekonstrukcí z PDF. Final/Koncept × profil × šablona tak
publikuje vždy trojici artefaktů `.pdf`, `.html` a `.md`.

Viewer se otevírá přímo na školní verzi ve stavu Final + PDF; samostatná landing page
už není součástí běžného toku. Nabízí režimy Final, Koncept a Review, kde Koncept je
samostatný revizně označený artefakt a Review je dvousloupcové porovnání Final/Koncept.
Identita dokumentu je
`Název práce \\ jazyková verze \\ Final/Koncept/Review \\ PDF/Markdown/HTML \\ kapitola \\ stránka`
v PDF režimu. Jazyková, režimová a formátová menu zobrazují příslušné ikony.
Přepnutí formátu zachovává vybranou verzi i režim a načte přímo příslušný kompilovaný
artefakt. Markdown view zobrazuje skutečný obsah vygenerovaného `.md`; HTML view
vkládá skutečný vygenerovaný `.html`. PDF režim navíc nabízí persistentní sidebar
vlevo/vpravo s thumbnail/minimap reprezentací; před přepínačem stránky je dynamická navigace
kapitol odvozená přímo z PDF outline a přepínač stránky je poslední segment horní path lišty,
zatímco fit-width a `− / +` zoom zůstávají ve spodním status baru. Zoom podporuje Ctrl/⌘+scroll a pinch. Ovládací prvky specifické pro stránky/zoom jsou v HTML a
Markdown režimu skryté. Všechny formáty lze stáhnout nebo otevřít přímo.

Všechny ikonové ovládací prvky mají hover tooltipy. Viewer nabízí tři persistentní
režimy vzhledu: **Light**, **Dark** a **OLED**. OLED používá skutečnou černou (`#000000`)
pro shell, toolbar, sidebar a webové publikační plochy; PDF stránky zůstávají věrným
kanonickým výstupem dokumentu. Zvolený vzhled se propaguje také do HTML artefaktů a obou
panelů Review comparison. Koncept PDF nepřidává automatický `KONCEPT` vodoznak.
Review comparison může volitelně synchronizovat průběžnou scroll pozici PDF dokumentů.

`make web-check` provede TypeScript kontrolu a produkční Vite build. `make all`
vytvoří PDF + HTML + Markdown publikační matici a `make site` ji společně s
`variants.json` publikuje na GitHub Pages.

Nativní HTML export Typstu je stále experimentální, proto nenahrazuje React shell ani
kanonické tiskové PDF. Je použit jako sémantický kompilovaný artefakt uvnitř vlastního
vieweru, nikoli jako náhrada celé publikační aplikace.


### Klíčová slova a rejstřík

Terminologie používá dvě oddělené reprezentace:

- **Klíčová slova | Keywords** zůstávají ve front matteru jako stručný dynamický seznam skutečně použitých termínů.
- **Rejstřík | Index** je v zadní části dokumentu bezprostředně před **Seznamem příloh | List of appendices** a obsahuje celý kanonický katalog termínů deduplikovaný podle stabilního `id`.

Rejstřík je abecedně seskupen podle počátečního písmene kanonického názvu.
`Rejstřík` je jediná položka této terminologické části v hlavním Obsahu. Na začátku
Rejstříku je úplný klikací seznam termínů; za ním následují abecední skupiny a detailní
termínové sekce, které jsou z hlavního Obsahu explicitně vynechány. Obsah ostatních kapitol
podporuje číslovanou hierarchii do hloubky 6.

Inline hvězdičkové odkazy míří na stabilní `kw-<id>` záznam v rejstříku. Rejstřík
proto obsahuje i kanonické pojmy, které se v aktuálním profilu rukopisu přímo nepoužily.
