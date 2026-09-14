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

#added[
V návaznosti na stanovené cíle si práce klade tři konkrétní inženýrské výzkumné otázky:
- *VO1 (Míra automatizace a role člověka)*: Lze vývojový proces od zadání požadavku (GitHub Issue) po vytvoření funkčního pull requestu plně zautomatizovat tak, aby role vývojáře spočívala pouze ve schvalování záměru a plánu, aniž by musel sám psát kód nebo řešit syntaktické chyby?
- *VO2 (Doménová přenositelnost)*: Lze identické centrální workflow a tutéž agentní pipeline použít pro programovací kód (Python) i pro sazbu textového dokumentu (Typst) pouhou změnou jediného konfiguračního souboru (`.github/darkfactory.json`)?
- *VO3 (Provozní odolnost a obnova)*: Dokáže systém samostatně překonat vyčerpání API limitů (HTTP 429) a chyby v testech, aniž by došlo k havárii běhu v GitHub Actions nebo ke ztrátě rozpracovaného kódu?

Odpovědi na tyto otázky jsou v práci ověřeny empirickým provozním nasazením na třech produkčních repozitářích, vyhodnocením úspěšnosti průchodu životním cyklem požadavků a analýzou chování systému při simulovaných i reálných výpadcích infrastruktury.
]

== Metodika

#confirmed[Práce je z povahy tématu konstrukční a inženýrská: primárním výstupem je funkční, plně integrovaný systém a empirické vyhodnocení jeho provozní spolehlivosti v reálném vývojovém prostředí. Postup odpovídá iterativnímu inženýrskému cyklu: po analýze teoretických východisek následoval návrh modulární architektury, implementace řídicího metaharnessu a jeho postupné nasazení na tři typově odlišné repozitáře:
1. *DarkFactory*: mateřský repozitář systému (Python, GitHub Actions, metaharness).
2. *OdbornaPrace-paper*: repozitář samotného rukopisu této práce (doména akademických textů a sazby v systému Typst).
3. *ChessWithQuests*: aplikační projekt s herní logikou.

Empirické ověření probíhalo longitudinálním sledováním reálných integračních běhů v prostředí GitHub Actions nad skutečnými požadavky (GitHub Issues) a pull requesty. Místo syntetických laboratorních benchmarků (např. izolovaného vyhodnocování na datasetech typu SWE-bench) se výzkum soustředil na end-to-end spolehlivost v produkčních podmínkách: sledována byla schopnost pipeline projít celým životním cyklem bez uváznutí, četnost vyčerpání kontextu či API limitů, chování záchranných mechanismů při rotaci modelů a zejména kvalitativní a kvantitativní analýza chyb, které se projevily v reálném provozu. Získané poznatky sloužily k průběžné optimalizaci a zpevnění mantinelů celého systému.]


