#import "../templates/registry.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note

#unconfirmed[
= Obsah přiloženého média

Odevzdaný archiv obsahuje kompletní zdrojové soubory práce, sazební šablonu, řídicí skripty a zdrojový kód autonomního systému DarkFactory.

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
) <kod-strom-prilohy>
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

#figure(
  ```typ
  #import "../templates/registry.typ": note, issue, alert, critique, added, draft, accepted, finalized, diff

  // --- 1. Panely na okraji textu (Callouty) ---
  #note[Doplňte porovnání rychlosti kompilace mezi verzemi 0.1 a 0.2.]
  #issue[Chybná signatura funkce: chybí povinný parametr timeout.]
  #alert[Sekce postrádá shrnutí naměřených výsledků před diskusí.]
  #critique[Metodologická absence baseline prokazující přínos nového modulu.]
  #blue-note[Metodické vymezení: rozsah práce a oddělení agentního inženýrství od strojového učení.]

  // --- 2. Textové revizní funkce (zvýraznění v toku textu) ---
  #draft[Tento odstavec tvoří neověřený koncept čekající na schválení.]
  #added[Nově vygenerovaná sekce automaticky začleněná agentem.]
  #accepted[Uživatelem přijatý text, který ještě nebyl finalizován.]
  #removed[Zastaralý text navržený k odstranění.]
  // Návrh změny: nový text je automaticky unconfirmed a raw drží starou stranu.
  #diff[Původní chybné znění textu.][Navržené nové znění textu.]

  // Po schválení se diff odstraní a zůstane pouze správná delta:
  #accepted[Schválené nové znění textu.]
  #finalized[Uzavřené nové znění nebo strukturální prvek.]
  ```,
  caption: [Ukázka zápisu a použití revizních značek a textových funkcí v jazyce Typst.],
) <kod-znacky-typst>

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
- *Přijatý text (`#accepted`)*: #accepted[Text byl odsouhlasen uživatelem, ale může ještě projít dalším začištěním.]
- *Finalizovaný text (`#finalized`)*: #finalized[Text nebo struktura je považována za uzavřenou součást práce.]
- *Navrženo k odstranění (`#removed`)*: #removed[Tato neaktuální věta je navržena k úplnému smazání z rukopisu.]
- *Srovnávací diff (`#diff`)*: #diff[Původní platné znění pasáže.][Navržené nové znění čekající na posouzení.]
- *Čistý neoznačený text*: Běžný text bez explicitního workflow stavu; sám o sobě neznamená finalizaci.

Role značek v lidském dohledu:
- *Čistý neoznačený text*: Běžný text bez explicitního workflow stavu.
- *Žluté podbarvení (`#unconfirmed`)*: Neověřený koncept čekající na lidské posouzení.
- *Zelené podbarvení (`#added`)*: Nově vygenerované návrhy agenta.
- *Modré podtržení (`#accepted`)*: Uživatelem přijatý text, který zůstává dále editovatelný.
- *Zelené podtržení (`#finalized`)*: Uzavřený text nebo strukturální prvek.
- *Srovnávací diff (`#diff`)*: Návrh změny; review zobrazí starou červenou stranu a novou zelenou stranu, jejíž obsah je současně neověřený. Raw/final zachová staré znění až do schválení. Po přijetí nebo finalizaci se diff zcela odstraní.
- *Postranní panely (Callouty)*: Striktní oddělení námětů, chyb a oponentury od těla textu.
]
