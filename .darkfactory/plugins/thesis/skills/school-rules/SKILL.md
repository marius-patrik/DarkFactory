---
name: school-rules
description: Use when typesetting the thesis, adding a component such as a figure or table, touching the annotation, or when asked whether something the supervisor requires is satisfied.
license: MIT
---

# Závazná školní pravidla

Pramen je školní *Průvodce tvorbou odborné práce* (Gymnázium J. K. Tyla). Znění je citováno doslova,
aby bylo dohledatelné proti originálu; číslo v závorce odkazuje na kapitolu průvodce. Doporučující
část průvodce není závazná a v této dovednosti není.

Pravidla jsou rozdělena: **závazné** je to, co lze zkontrolovat a co se promítá do hodnocení. Nic
zde není doporučení.

## Sazba textu (kap. 4)

| Pravidlo | Znění | Kde |
| :--- | :--- | :--- |
| Okraje | „Okraje stránky jsou nastavené na 2,5 cm, u hřbetu navíc 0,5 cm (tedy 3 cm celkem)." | `styles/page.typ` |
| Patkový font | „V celé práci se používá jednotný patkový font, standardně černá barva." | Caladea |
| Velikost a zarovnání | „Hlavní text je zarovnaný do bloku a má velikost 12 bodů." | `styles/body.typ` |
| Řádkování | „Řádkování textu je 1,5 řádku" | `leading: 1.5 × 0.65em` |
| Mezera pod odstavcem | „mezera pod odstavcem má velikost 8 bodů" | `styles/body.typ` |
| Odsazení | „První řádek odstavce se zleva zvlášť neodsazuje." | `first-line-indent: 0pt` |

Průvodce výslovně upozorňuje, že **12 bodů a patkový font jsou závazné**, a že mnoho odevzdaných
prací používá 11 bodů Calibri, což pravidlům neodpovídá.

### Odchylka, která byla nalezena a má být napravena

`rules.md` uváděla `spacing: 8pt` jako splněné, ale `styles/body.typ` měl `spacing: 24pt`. Sada
publikace i sestavení PDF to neodhalí, protože obě hodnoty jsou platný Typst. **Odchylku od
závazného pravidla neopravuj mlčky a nevyhlašuj ji za splněnou.** Je to bod k rozhodnutí autora;
do té doby je hodnota 24 pt odchylkou.

Sázba je jediná oblast, kde je „správná hodnota“ místo jednoho čísla otázkou výkladu. V Typstu je
`par(spacing:)` **cílová vzdálenost mezi odstavci, ne přírůstek nad řádkováním**, takže číslo ve stylu
není mezera, která vznikne na stránce. Řádkování je tu `1.5 × 0.65em`, tedy 11,7 pt při 12 pt, a
kladná mezera 8 pt je proto `spacing` rovných **19,7 pt** — nikoli 8 pt a nikoli 27,6 pt. Který
výklad vedoucí uznává, zeptej se.

**Neměř to odhadem** — změř to ve sestaveném PDF, viz `paper-verify`.

## Kapitoly a nadpisy (kap. 4)

- „Kapitoly i podkapitoly se číslují vzestupně. **Za poslední číslicí čísla kapitoly se nepíše
  tečka**" — tedy `2`, `2.1`, nikoli `2.`.
- Velikosti nadpisů **16 / 14 / 12 bodů, vždy tučně**.
- „Mezera před nadpisem je velikost písma nadpisu plus 5 bodů (následuje-li po odstavci nadpis na
  téže stránce, mezera před nadpisem musí být větší než mezera pod nadpisem, aby bylo vizuálně
  zřejmé, ke které kapitole text patří)."

## Číslování stran a obsah (kap. 4)

- „Čísla stránek se uvádí v zápatí, jsou zarovnaná na střed, napsaná stejným fontem jako text práce,
  velikostí 11 bodů."
- „Čísla stránek se uvádějí **od úvodu**, za stranu 1 se považuje titulní strana práce. Úvod tedy
  není na straně 1." Zápatí se zapíná až za obsahem, čítač se nuluje od titulní strany.
- „Součástí práce je automaticky vygenerovaný obsah obsahující čísla a názvy kapitol a podkapitol a
  čísla stran, na kterých tyto kapitoly a podkapitoly začínají."

## Součásti textu (kap. 4 a 6)

Pravidla, která se nejčastěji porušují:

- **Odkaz v textu je povinný.** „Na každou součást odborného textu, která je v textu uvedena, musí
  být v textu odkaz, aby čtenář pochopil, k čemu součást textu slouží a jaký je její význam."
- **Součást včetně popisku musí být celá na jedné straně.** „Podmínkou ale je, aby součást včetně
  svého popisu byla celá na stejné straně."
- **Umístění:** „co nejblíže za první odkaz na tuto součást, zpravidla na samostatný řádek."
- **Převzaté součásti se citují v popisku.** „Odkaz na zdroj se uvádí v popisku součásti, citace
  se řadí do seznamu zdrojů na konci práce. … v opačném případě se jedná o plagiát."
- **Seznam součástí je automatický a musí být kompletní**, včetně čísel stran.
- **Popisek obrázku:** stejný font, o dva body menší (10 b), **vždy pod obrázkem**, zarovnaný vlevo,
  průběžné číslování.
- **Popisek tabulky:** stejný font, 10 b, vlevo; při pokračování na další straně se záhlaví opakuje a
  popisek ne.
- **Kód** se „graficky oddělí, např. ohraničí rámečkem".
- **Text uvnitř grafu** se sází bezpatkovým písmem. Týká se `Graf`, nikoli schématu `Obrázek` —
  schémata v této práci jsou obrázky.
- **Přílohy:** velké součásti se přesunou do přílohy; přílohy se číslují, odkazuje se na ně v textu
  a musí mít vlastní seznam.

## Zdroje a citace (kap. 5)

- **Jedna metoda v celé práci.** „V celé práci se používá jeden způsob citací. Způsob citací
  určuje vedoucí práce." Zde číselné odkazy, ISO 690 numeric, `gjkt-iso690-numeric-cs.csl`.
- **Pořadí podle první citace.** „Číslem v hranatých závorkách, kulatých závorkách nebo horním
  indexu odkazujeme v textu na citované zdroje **v pořadí, v jakém jsou citovány poprvé**.
  Dokument, na který se odkazuje vícekrát, má stále stejné číslo."
- **Více zdrojů v jedné závorce, oddělené středníkem:** `[4; 12]` — nikoli `[4, 12]`.
- **Zdroj musí být dohledatelný.** U internetové stránky se vyžaduje „název stránky, URL, rok
  vytvoření, datum změny, autor (jsou-li údaje známy), datum citování". cesta ke souboru v CDN
  nestačí; citovat je třeba stránku, kterou člověk najde.

## Anotace a klíčová slova (kap. 2.1)

- **Anotace 150–250 slov**, psaná minulým nebo přítomným časem, jako popis toho, co bylo uděláno,
  **nikoli jako hodnocení**. Struktura odpovídá struktuře práce: problém → metody → výsledky →
  případně doporučení.
- **Klíčová slova: přibližně pět pojmů**, ani příliš dlouhá, ani krátká; neměla by obsahovat stejné
  pojmy jako název práce.

## Strukturální požadavky (kap. 2 a 7)

Průvodce nepožaduje jen sazbu, ale i strukturu. Chybělo toto a všechno je opravené; je to
součást invariantů, ne dohoda:

- výzkumná otázka a hypotéza — „Cílem teoretické částy je především stanovení hypotéz" (kap. 2.3),
- závěr hodnotí naplnění cíle — „Musí z něj být jasné, zda bylo dosaženo cíle práce" (kap. 2.6),
- závěr uvádí doporučení pro další výzkum (kap. 2.6),
- diskuse obsahuje „případné limity vašeho výzkumu" (kap. 2.5),
- cíl je „ověřitelný, dosažitelný, dostatečně konkrétní" (hodnoceno 5 b),
- anotace i abstrakt popisují skutečný rozsah práce.

## Co tato dovednost neřeší

Nevědí, co je **pravdivé** o kódu, co je v pořádku mluvit jinak než šablona a kde autor vědomě
odstoupil. To jsou `thesis-invariants` a `czech-academic-prose`. Školní pravidla jsou věc
vedoucího: pokud ti připadá, že pravidlo zabraňuje tomu, co je v práci lepší, **zeptej se, než to
obejdeš**.
