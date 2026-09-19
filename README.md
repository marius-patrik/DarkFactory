# Odborná práce — Úvod do agentického AI a harness pro automatizovaný softwarový vývoj

> Odborná práce na Gymnáziu J. K. Tyla. Autor: **Patrik Marius**, 4.D.
> Vedoucí práce: **Michal Dočekal**. Rok: **2026**.

Práce se zabývá návrhem a realizací autonomního systému pro vývoj softwaru.
Praktickou částí je systém [DarkFactory](https://github.com/marius-patrik/DarkFactory),
který práci zároveň sází, testuje a publikuje.

## Repozitářová architektura

Aktivní architektura má pouze dva repozitáře:

- **DarkFactory-Paper** — rukopis, sazba, interní Typst šablonu a integrační bod praktické části.
- **DarkFactory** — vlastní agentní harness; v tomto repozitáři je připojen jako jediný submodule `darkfactory/`.

Dřívější `OdbornaPrace-mono` wrapper už není potřeba. Samostatná šablona byla
přesunuta dovnitř práce jako `templates/gjkt-odborna-prace/`, takže sazba a
rukopis se nemohou verzově rozcházet.

## Dokumentové šablony

Výchozí šablona je `gjkt-odborna-prace`. Každá šablona žije v `templates/<name>/`
a exportuje funkci `template(...)[body]`. Rukopis importuje pouze
`templates/registry.typ`, takže konkrétní sazbu lze přepnout bez kopírování textu.

```bash
make all TEMPLATE=gjkt-odborna-prace
make all-templates
make template-check
```

`make all-templates` kompiluje všech osm profil/review variant pro každou nalezenou
šablonu do `out/templates/<template>/`.

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
make ci         # všech 8 PDF + kontrola artefaktů a release manifestu
make site       # sestaví PDF a lokální podobu GitHub Pages
```

CI používá stejný `make ci` kontrakt. Job `ci / paper` kompiluje všech osm variant,
ověří jejich PDF hlavičky a release manifest a následně nahraje všechny výsledky jako
GitHub Actions artifact. Release workflow spouští stejnou validaci před zabalením assetů.

Písma jsou přibalena v `fonts/`, takže výsledek je reprodukovatelný bez systémové
závislosti na konkrétní instalaci písem.

## GitHub Pages

Pages web publikuje výběr všech osmi variant. Odkazy míří přímo na PDF, takže se
otevírají v nativním PDF vieweru prohlížeče místo vlastní implementace vieweru.

<https://marius-patrik.github.io/DarkFactory-Paper/>

## Struktura

| Cesta | Účel |
| :--- | :--- |
| `main.typ` | jediný kanonický compiler entrypoint |
| `thesis.typ` | společné sestavení obsahu práce |
| `metadata.typ` | název, autor, škola, anotace a jazykové varianty metadata |
| `kapitoly/*.typ` | text práce |
| `templates/gjkt-odborna-prace/` | interní Typst šablonu: sazba, review vrstva, profily, termíny a počítání rozsahu |
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
