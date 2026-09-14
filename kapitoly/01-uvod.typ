#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Úvod

#confirmed[
Vývoj softwaru se za posledních dvacet let z velké části zautomatizoval.
Sestavení programu, spuštění testů, kontrola stylu i nasazení do provozu dnes
obstarávají stroje a nikdo je nepovažuje za práci hodnou lidského času. Jeden
krok však zůstal ruční: samotná změna zdrojového kódu. Právě tam se tvoří většina
prodlev — mezi okamžikem, kdy někdo popíše požadavek, a okamžikem, kdy se změna
dostane k uživatelům.

Výrobní průmysl zná pojem _dark factory_, tedy „temná továrna“: provoz, který
běží bez lidské obsluhy, a proto v něm nemusí svítit. Nejde o představu úplného
vyloučení člověka — i temná továrna má konstruktéry, kteří rozhodují, co se bude
vyrábět — nýbrž o vyloučení člověka z opakujících se úkonů. Tato práce zkoumá,
jak stejný princip uplatnit ve vývoji softwaru.
]

== Motivace

#confirmed[
S rozšířením velkých jazykových modelů se objevila možnost automatizovat i psaní
kódu. Většina dostupných nástrojů však řeší jen dílčí krok: vygenerují návrh
změny, který někdo musí zasadit do procesu, ověřit a schválit. Chybí popis toho,
jak má takový nástroj zapadnout do vývojového procesu jako celku — kdo schvaluje,
co se stane při selhání a jak se pozná, že je výsledek správný.

Právě tato mezera je předmětem práce. Zajímavá není otázka, zda model dokáže
napsat kód; to je dnes doloženo. Zajímavá je otázka, jaké okolí musí kolem
takového modelu vzniknout, aby jeho výstupu bylo možné důvěřovat.
]

== Cíl práce

#confirmed[
Cílem této práce je navrhnout, realizovat a ověřit systém, který automatizuje
vývojový proces od přijetí požadavku po vytvoření ověřené změny, aniž by se vzdal
lidského schválení v rozhodujících bodech.

Dílčí cíle:

+ Popsat současný stav automatizace vývoje softwaru a orchestrace jazykových
  modelů.
+ Navrhnout architekturu systému, který provede požadavek celým procesem.
+ Systém realizovat a nasadit na reálné repozitáře.
+ Vyhodnotit jeho chování a pojmenovat omezení, na která v provozu narazil.
]

#unconfirmed[
V návaznosti na stanovené cíle si práce klade tři konkrétní výzkumné otázky:
- *VO1*: Do jaké míry lze rutinní fáze softwarového vývoje (analýza, implementace, testování, dokumentace) automatizovat pomocí orchestrace jazykových modelů při zachování deterministických záruk a nulové regrese v hlavní větvi?
- *VO2*: Jaké jsou fundamentální limitující faktory současných LLM při samostatné práci nad reálným repozitářem z hlediska kapacity kontextového okna, degradace pozornosti a stability nástrojů?
- *VO3*: Umožňuje zavedení jednotného deklarativního manifestu (`darkfactory.json`) a centralizovaného CI workflow škálovat autonomní pipeline napříč heterogenními projekty s minimálními dodatečnými náklady na údržbu?
]

#note[Operacionalizace výzkumných otázek: Doporučuji v úvodu stručně uvést kvantitativní metriky a kritéria úspěšnosti pro zodpovězení VO1–VO3 (např. cílová míra průchodnosti CI bez regrese, práh akceptovatelné latence a definice konstantní údržbové složitosti $O(1)$), aby bylo v kapitolách 4 a 5 zřejmé, na základě jakých exaktních prahů byly otázky vyhodnoceny.]

== Metodika

#confirmed[Práce je z povahy tématu konstrukční a inženýrská: primárním výstupem je funkční, plně integrovaný systém a empirické vyhodnocení jeho provozní spolehlivosti v reálném vývojovém prostředí. Postup odpovídá iterativnímu inženýrskému cyklu: po analýze teoretických východisek následoval návrh modulární architektury, implementace řídicího metaharnessu a jeho postupné nasazení na tři typově odlišné repozitáře:
1. *DarkFactory*: mateřský repozitář systému (Python, GitHub Actions, metaharness).
2. *OdbornaPrace-paper*: repozitář samotného rukopisu této práce (doména textu a sazby v systému Typst).
3. *ChessWithQuests*: aplikační projekt s herní logikou.

Empirické ověření probíhalo longitudinálním sledováním reálných integračních běhů v prostředí GitHub Actions nad skutečnými požadavky (GitHub Issues) a pull requesty. Místo syntetických laboratorních benchmarků (např. izolovaného vyhodnocování na datasetech typu SWE-bench) se výzkum soustředil na end-to-end spolehlivost v produkčních podmínkách: sledována byla schopnost pipeline projít celým životním cyklem bez uváznutí, četnost vyčerpání kontextu či API limitů, chování záchranných mechanismů při rotaci modelů a zejména kvalitativní a kvantitativní analýza chyb, které se projevily v reálném provozu. Získané poznatky sloužily k průběžné optimalizaci a zpevnění mantinelů celého systému.]


