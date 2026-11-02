---
name: thesis-invariants
description: Use when editing any part of the thesis, when a claim about the pipeline or the methodology is at stake, or when asked whether something in the paper may be changed.
license: MIT
---

# Invarianty práce

Tato dovednost obsahuje věci, které se **nemění**. Jiná dovednost (`school-rules`) obsahuje pravidla
školy, která se mění jen se souhlasem vedoucího. Tady jde o tvrzení o kódu, o kterých autor
ví, že byla vyvrácena, a o rozhodnutí, která byla přijata.

Když cokoliv z tohoto seznamu brání úpravě, **zastav se a napiš to autorovi**. Neopravuj to
sám, neinterpretuj to jinak, nevynechej to. Tvrzení, která byla jednou vyvrácena, byla vyvrácena
proto, že se na ni dalo spoléhat.

## Připnutá revize

Praktická část popisuje **jedinou** revizi: `d576ec8f` (14. září), citovanou jako
`@darkfactory-d576ec8f`. Je to poslední revize, v níž pipeline ještě volala produkční harnesse
přímo.

**Nic nepřepisovat z HEAD.** Tvrzení o kódu se ověřují proti `d576ec8f`, ne proti současnému stavu
repozitáře. Novější revize pipeline přesměrovala přes `df`, takže v HEAD je přímé volání těch CLI
mrtvý kód a čtení z HEAD dává nesprávné závěry.

## Čtyři opravená tvrzení

Každé z nich bylo v práci napsáno špatně a bylo opraveno. Změna, která by je vrátila, je chyba.

**1. `Blocked` znamená vyčerpanou kvótu, ne opakovaný nález.**
`pages/34-practical-implementation.typ`
> „Smyčka je ohraničena nejvýše třemi iteracemi… Po vyčerpání tří iterací však smyčka skončí bez
> jakéhokoli verdiktu a bez komentáře… Jediným stavem, který v této revizi znamená zablokování, je
> vyčerpaná kvóta…"

**2. Čisté review běží před kontrolou souladu s plánem, ne po ní.**
`pages/34-practical-implementation.typ`
> „Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Ani ta
> není porovnáním sad souborů: je to druhý dotaz modelu…"

**3. Schválení je seznam dvou účtů, ne autor issue.**
`pages/35-practical-integration.typ`
> „aktér se porovnává se seznamem dvou pevně zapsaných účtů… Neověřuje se tedy autor issue ani
> úroveň oprávnění, ale členství v tomto seznamu"

**4. Testy se spouštějí jednou; po opravě už ne.**
`pages/34-practical-implementation.typ`
> „Testovací sady se přitom spouštějí pouze jednou a po opravě už ne… Opakovatelná kontrola tedy
> rozliší dobrý a špatný stav, ale není překážkou"

Kontrola, že tyto čtyři věty v textu jsou, je v dovednosti `paper-verify`. Je to grep na české
znění, protože sada publikace kontroluje strukturu PDF, ne obsah.

## Tři metodická kritéria

Formulovaná v §3.1 výslovně jako **provozní převedení této práce**, nikoli jako převzatá
taxonomie. Podmínka `musí` je míněna podmíněně: nutné jsou jen ty principy, které samotný model bez
zásady okolí neposkytne.

1. **Stav leží mimo model a je zjistitelný.** Je třeba pojmenovat artefakt, kde žije, a člověka, který
   se na něj podívá, aniž by se musel modelu zeptat.
2. **Brány jsou výslovné a druhy jejich rozhodnutí se nerozplývají.** Brána musí existovat, vědět,
   jaké rozhodnutí činí, a své rozhodnutí označit podle druhu. Tři druhy: deterministická kontrola
   (výsledek lze přepočítat nebo spustit znovu bez modelu), brána hodnocená modelem (dotaz na jiný
   model, tedy stejně pravděpodobný jako to, co posuzuje), a lidská brána. Běh nesmí projít jedním
   druhem brány prostředky jiného.
3. **Člověk rozhoduje, co vstoupí do produkce.** Určený okamžik, určená osoba, určené rozhodnutí a
   **žádná jiná cesta do téhož bodu**. Podmínka ‚určený‘ je ostrá.

Aplikace je v §4.1. První dvě kritéria popsaná konfigurace plní, třetí **plní podmíněně** — proxy
schválení může vyplnit jmenovaný okamžik strojem, a znění kritéria vyžaduje nepřítomnost jakékoli
jiné cesty.

**Rozsud o tom, zda konfigurace třetí kritérium splňuje, záměrně není pronesen a patří autorovi.**
Nedoplňuj ho. Není to nedostatek textu, je to záměr.

## Odkazy a křížové reference

- **V textu nesmí být žádné zapsané číslo stránky, kapitoly, obrázku ani tabulky.** Všechny
  reference jsou symbolické (`@label`). Vyplácí se to: odebrání stránky nikdy nic nerozbilo.
- Každá očíslovaná součást musí mít odkaz v textu, co nejblíže prvnímu uvedení.
- Seznam součástí textu je generovaný a musí být úplný. Filtruje obrázky, tabulky **a** výpisy
  kódu — klauzule `.or(kind: raw)` existuje proto, že `Výpis 1` ze seznamu tiše chyběl.

## Bibliografie

- **Každá položka seznamu zdrojů musí být citovaná.** Neexistující výjimka; nepřebytečné zdroje se
  odstraňují na konci, ne tichým vypuštěním.
- Způsob citace je v celé práci jeden, určuje ho vedoucí: číselné odkazy podle ISO 690, ve stylu
  `gjkt-iso690-numeric-cs.csl`, pořadí podle první citace, jedno stabilní číslo na dokument.
- Šablona CSL **ticho vypouští pole `note`**, takže poznámka v bibliografii nevypíše. Provenience
  proto musí žít v textu a v popiscích, ne v seznamu zdrojů.
- Nic nevymýšlet: žádné zdroje, fakta, snímky obrazovky ani citáty. Co nebylo přečteno první rukou,
  se necituje.

## Co tato dovednost neřeší

Nevědí, jak sázba odpovídá školním pravidlům — to je `school-rules`. Neví, jak bezpečně upravovat
Typst — to je `typst-safe-editing`. A neprohlašuje, že je dostatečná: jakmile narazíš na tvrzení,
které tu není a které odporuje kódu, **neopravuj ho podle domněnky**. Zjisti, kdo ho tam dal,
a ptej se.
