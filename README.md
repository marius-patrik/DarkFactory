# Odborná práce — Agentické inženýrství a design harnessu pro automatizovaný softwarový vývoj

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

```typ
#term(terms.harness)
#term(terms.harness, render: "explanation", detail-language: "cs")
#term(
  terms.harness,
  render: "both",
  name-type: "both",           // proper | industry | both | auto
  name-order: "cs-en",
  detail-order: "cs-en",
  name-separator: "bar",
  name-type-separator: "paren",
  detail-style: "inline",
)
```

Každý termín může mít dvě pojmenovací vrstvy:
- `proper` — formální/úplný název, samostatně pro češtinu a angličtinu,
- `industry` — běžná průmyslová zkratka nebo zažitý anglický název.

Například `language_model` má proper `Jazykový model / Large Language Model` a industry `LLM`; `agent_loop` má proper `Smyčka ReAct / ReAct Loop` a industry `Agent Loop`; `skills` má český proper název `Dovednosti` a industry formu `Skills`.

Renderer podporuje:
- `name-type: "proper" | "industry" | "both" | "auto"`,
- `render: "term" | "explanation" | "both"`,
- nezávislé `name-language` a `detail-language`,
- nezávislé `name-order: "cs-en" | "en-cs"` a `detail-order`,
- `name-separator: "bar" | "paren" | "dash"`,
- inline nebo skládaný detail,
- automatickou registraci skutečně použitých termínů do sekce klíčových slov.

Výchozí školní/merged sazba používá češtinu jako první jazyk a angličtinu jako druhý.
Termíny se stejným českým a anglickým názvem se zobrazí pouze jednou.


## Webový viewer

GitHub Pages je samostatná React + TypeScript aplikace v `web/`, sestavovaná přes Vite.
UI používá shadcn/ui (Radix primitives + Tailwind), Motion pro přechody a Dagre pro
layout minimapy stránek. PDF z Typstu zůstává kanonickým vizuálním výstupem a
PDF.js nad ním renderuje canvas, textovou vrstvu i annotation vrstvu, takže text
zůstává označitelný/kopírovatelný a PDF odkazy jsou interaktivní.

Viewer nabízí Raw, Review a Split režim, výběr publikační verze, persistentní sidebar
vlevo/vpravo s thumbnail/minimap reprezentací a kontextovou nabídkou, page jump,
fit-width a `− / +` zoom ve spodním status baru, Ctrl/⌘+scroll a pinch zoom,
světlý/tmavý režim, fullscreen a přímé stažení PDF. Sidebar toggle používá podle
strany garantovanou ikonu levého/pravého sidebaru a sedí na krajním okraji toolbaru.
Identita dokumentu je `Home \\ Název práce \\ Verze \\ Final/Review/Split`; přepínač
režimu je součástí stejné path lišty a nabízí Final, Review i Split.
Všechny ikonové ovládací prvky mají hover tooltipy. Review PDF nepřidává automatický
`KONCEPT` vodoznak. Split view může volitelně synchronizovat průběžnou scroll pozici
obou dokumentů.

`make web-check` provede TypeScript kontrolu a produkční Vite build; `make site`
publikuje bundlované assety společně s PDF maticí a `variants.json`.

Oficiální UI webové aplikace Typst se zde nevkládá: není distribuováno jako
self-hostovatelná/embeddable open-source komponenta. Experimentální Typst HTML export
proto není produkčním viewerem této práce.


### Klíčová slova a encyklopedie

Terminologický front matter je rozdělen do dvou samostatných sekcí:

- **Klíčová slova | Keywords** — pouze stručný dynamický seznam skutečně použitých termínů.
- **Encyklopedie | Encyclopedia** — detailní záznamy stejných použitých termínů včetně českých/anglických vysvětlení.

Obě sekce vznikají ze stejné deduplikované množiny použití `terms.*`. Inline hvězdičkové odkazy míří na detailní záznam v encyklopedii, nikoli na krátký seznam klíčových slov.
