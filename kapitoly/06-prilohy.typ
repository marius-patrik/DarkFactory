#import "../packages/odborna-prace-template/src/lib.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

#unconfirmed[
= Obsah přiloženého média

Odevzdaný archiv obsahuje kompletní zdrojové soubory práce, sazební šablonu, řídicí skripty a zdrojový kód autonomního systému DarkFactory.

#diff[
#figure(
  ```text
  mono-OdbornaPrace/
  ├── prace/                          # Rukopis a sazba odborné práce
  │   ├── kapitoly/                   # Texty jednotlivých kapitol (01-uvod až 06-prilohy)
  │   ├── lib/odborna-prace.typ       # Sazební šablona, recenzní značky a formátování GJKT
  │   ├── img/                        # Vektorová procesní schémata (SVG) a grafické podklady
  │   ├── fonts/                      # Metricky shodná patková písma (Caladea)
  │   ├── bib/references.bib          # Bibliografická databáze citovaných zdrojů
  │   ├── scripts/                    # Pomocné a náhledové skripty
  │   ├── main.typ                    # Hlavní řídicí dokument sazby
  │   ├── metadata.typ                # Údaje o autorovi, vedoucím a anotace
  │   └── Makefile                    # Příkazy pro automatizovanou kompilaci a kontrolu
  ├── darkfactory/                    # Zdrojový kód systému DarkFactory (submodul)
  │   ├── .github/workflows/          # Sdílené šablony kontinuální integrace
  │   └── src/                        # Výkonné orchestrační jádro systému
  ├── out/prace.pdf                   # Výsledný vysázený tiskový dokument v PDF
  └── README.md                       # Dokumentace a návod na reprodukci prostředí
  ```,
  caption: [Stromová adresářová struktura odevzdaného elektronického archivu a doprovodných repozitářů.],
)
][
#figure(
  ```text
  DarkFactory-Paper/
  ├── kapitoly/                       # Text jednotlivých kapitol práce
  ├── packages/
  │   └── odborna-prace-template/     # Interní Typst package sazby a review systému
  │       ├── src/lib.typ
  │       ├── src/wordometer.typ
  │       └── typst.toml
  ├── darkfactory/                    # Jediný git submodule; praktická část DarkFactory
  ├── img/                            # Diagramy a grafické podklady
  ├── fonts/                          # Přibalená písma pro reprodukovatelnou sazbu
  ├── bib/references.bib              # Bibliografická databáze
  ├── scripts/                        # CI, Pages a náhledové pomocné skripty
  ├── main.typ                        # Jediný kanonický vstup kompilace
  ├── thesis.typ                      # Sestavení rukopisu
  ├── metadata.typ                    # Metadata, anotace a jazykové varianty
  ├── Makefile                        # Osm profilových/review výstupů a CI kontrakt
  └── README.md                       # Dokumentace repozitáře
  ```,
  caption: [Aktuální stromová struktura odevzdaného repozitáře práce a připojené praktické části.],
) <kod-strom-prilohy>
]
]

#unconfirmed[
= Schéma konfiguračního manifestu darkfactory.json

#struct-alert[
  *Příloha v rekonstrukci*: Formální JSON schéma manifestu bude doplněno po stabilizaci nového schématu v přestavěném systému DarkFactory.
]

#note[Placeholder: Zde bude uvedeno úplné JSON Schema vymezující validní syntaxi nového konfiguračního manifestu.]
]

#unconfirmed[
= Sdílené workflow pro GitHub Actions

#struct-alert[
  *Příloha v rekonstrukci*: Definice sdílených a volajících workflow pro GitHub Actions budou aktualizována po dokončení přestavby orchestrátoru.
]

#note[Placeholder: Zde budou uvedeny ukázky znovupoužitelného a volajícího workflow nové verze DarkFactory.]
]

#unconfirmed[
= Systémové prompty plánovacího a kódovacího agenta

#struct-alert[
  *Příloha v rekonstrukci*: Systémové prompty pro plánovací a implementační fáze budou aktualizovány podle nových rolí a instrukčních šablon v přestavěném systému.
]

#note[Placeholder: Zde budou uvedeny kompletní systémové prompty pro jednotlivé fáze životního cyklu požadavku.]
]

#unconfirmed[
= Protokol revizních značek v sazebním systému Typst

Tato příloha uvádí referenční definici a použití vizuálních revizních značek pro řízení a dohled nad generovaným textem v sazebním formátu Typst.

#diff[
#figure(
  ```typ
  #import "lib/odborna-prace.typ": note, issue, alert, critique, added, draft, confirmed, diff

  // --- 1. Panely na okraji textu (Callouty) ---
  #note[Doplňte porovnání rychlosti kompilace mezi verzemi 0.1 a 0.2.]
  #issue[Chybná signatura funkce: chybí povinný parametr timeout.]
  #alert[Sekce postrádá shrnutí naměřených výsledků před diskusí.]
  #critique[Metodologická absence baseline prokazující přínos nového modulu.]
  #blue-note[Metodické vymezení: rozsah práce a oddělení agentního inženýrství od strojového učení.]

  // --- 2. Textové revizní funkce (zvýraznění v toku textu) ---
  #draft[Tento odstavec tvoří neověřený koncept čekající na schválení.]
  #added[Nově vygenerovaná sekce automaticky začleněná agentem.]
  #confirmed[Uživatelem zkontrolovaný text, který ještě nebyl finalizován.]
  #removed[Zastaralý text navržený k odstranění.]
  #diff[Původní chybné znění textu.][Nové opravené znění textu po revizi.]
  ```,
  caption: [Ukázka zápisu a použití revizních značek a textových funkcí v jazyce Typst.],
)
][
#figure(
  ```typ
  #import "../packages/odborna-prace-template/src/lib.typ": \
    note, issue, alert, critique, blue-note, \
    added, draft, unconfirmed, confirmed, removed, diff

  // --- 1. Review callouty ---
  #note[Doplňte porovnání rychlosti kompilace mezi verzemi 0.1 a 0.2.]
  #issue[Chybná signatura funkce: chybí povinný parametr timeout.]
  #alert[Sekce postrádá shrnutí naměřených výsledků před diskusí.]
  #critique[Metodologická absence baseline prokazující přínos nového modulu.]
  #blue-note[Metodické vymezení rozsahu práce.]

  // --- 2. Textové review funkce ---
  #unconfirmed[Neověřený koncept.]
  #added[Nově přidaný text.]
  #confirmed[Uživatelem potvrzený text.]
  #removed[Text navržený k odstranění.]
  #diff[Původní znění.][Nové znění.]
  ```,
  caption: [Aktuální zápis revizních značek importovaných z interního Typst package.],
) <kod-znacky-typst>
]

*Vizuální reprezentace jednotlivých prvků v sazbě*

Pro přehlednost jsou níže uvedeny reálné ukázky jednotlivých revizních panelů a textových funkcí v jejich finální vizuální podobě:

#note[Ukázka zeleného panelu doporučení (`#note`): Konstruktivní návrh na vylepšení, doplnění diagramu nebo námět na architektonickou optimalizaci.]

#issue[Ukázka červeného panelu vady (`#issue`): Zjištěná faktická nesrovnalost, logická mezera, syntaktická chyba či překlep vyžadující opravu.]

#alert[Ukázka žlutého panelu strukturálního upozornění (`#alert` / `#struct-alert`): Hloubková nevyváženost podkapitol, nekonzistence osnovy či absence klíčových náležitostí práce.]

#critique[Ukázka oranžového panelu oponentury (`#critique`): Břitká, nekompromisní oponentura — zpochybnění neověřených předpokladů, analýza slabin metodiky a příprava na otázky zkušební komise.]

#blue-note[Ukázka modrého panelu metodického vymezení (`#blue-note` / `#scope-note`): Vymezení rozsahu práce, formulace mantinelů a architektonických abstrakcí.]

Ukázky textových zvýrazňovacích a srovnávacích funkcí v toku odstavce:
- *Neověřený koncept (`#draft` / `#unconfirmed`)*: #unconfirmed[Tento text představuje koncept čekající na posouzení autorem.]
- *Nově přidaný text (`#added`)*: #added[Tato pasáž byla nově vygenerována autonomním agentem na základě požadavku.]
- *Potvrzený text (`#confirmed`)*: #confirmed[Text byl předběžně odsouhlasen uživatelem, čeká na finální začištění.]
- *Navrženo k odstranění (`#removed`)*: #removed[Tato neaktuální věta je navržena k úplnému smazání z rukopisu.]
- *Srovnávací diff (`#diff`)*: #diff[Původní chybné nebo nepřesné znění pasáže.][Nové přesné, fakticky a formálně ověřené znění pasáže.]
- *Čistý neoznačený text*: Představuje finální, autorsky schválený text v hlase autora bez jakéhokoliv podbarvení.

Role značek v lidském dohledu:
- *Čistý neoznačený text*: Schválený autorský text v hlase autora.
- #diff[*Žluté podbarvení (`#unconfirmed`)*: Neověřený koncept čekající na lidské posouzení.][*Žluté podtržení (`#unconfirmed`)*: Neověřený koncept čekající na lidské posouzení.]
- *Zelené podbarvení (`#added`)*: Nově vygenerované návrhy agenta.
- #diff[*Modré podbarvení (`#confirmed`)*: Uživatelem odsouhlasený text.][*Zelené podtržení (`#confirmed`)*: Uživatelem odsouhlasený, ale ještě nefinalizovaný text.]
- #diff[*Srovnávací diff (`#diff`)*: Transparentní vizualizace navržených oprav.][*Srovnávací diff (`#diff`)*: GitHub-style červený řádek `-` pro původní text a zelený řádek `+` pro navrženou náhradu.]
- *Postranní panely (Callouty)*: Striktní oddělení námětů, chyb a oponentury od těla textu.
]
