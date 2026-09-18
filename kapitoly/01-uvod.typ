#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

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
Cílem této práce je představit principy agentního inženýrství (_agentic engineering_) a navrhnout architekturu řídicího harnessu pro automatizovaný softwarový vývoj, který provede vývojový požadavek celým procesem od zadání po ověřenou změnu, aniž by se vzdal lidského dohledu v rozhodujících bodech.

Dílčí cíle:

+ Popsat současný stav automatizace vývoje softwaru a teoretická východiska agentních systémů.
+ Vymezit principy agentního inženýrství a deterministického řízení jazykových modelů (harness, správa kontextu, detekce uvíznutí v ReAct smyčce).
+ Navrhnout architekturu řídicího harnessu pro spolehlivý a bezpečný běh kódovacích agentů.
+ Analyzovat bezpečnostní mantinely, limity kontextu a provozní úskalí autonomních vývojových procesů.
]

#added[
V návaznosti na stanovené cíle si práce klade tři konkrétní inženýrské výzkumné otázky:
- *VO1 (Míra automatizace a role člověka)*: Lze vývojový proces od zadání požadavku (GitHub Issue) po vytvoření funkčního pull requestu strukturovat tak, aby role vývojáře spočívala v architektonickém dozoru a schvalování záměru (Human Gate), aniž by musel sám psát kód nebo řešit syntaktické regrese?
- *VO2 (Řízení divergence a spolehlivost smyčky)*: Jakými deterministickými mechanismy (stuck detection, rozpočet tahů, circuit breaker) lze v řídicím harnessu zabránit patologiím jazykových modelů, jako je perseverace, oscilace či nekonečné zacyklení v ReAct smyčce?
- *VO3 (Integrita paměti a eliminace sémantického posunu)*: Jakými postupy lze efektivně spravovat kontextové okno agenta při komplexních úlohách, aby nedocházelo k degradaci pozornosti (Context Rot) a destruktivní ztrátě architektonických invariantů při rekurzivní kompresi?
]

== Metodika

#confirmed[Práce je z povahy tématu teoreticko-architektonická a inženýrská: primárním výstupem je formulace principů agentního inženýrství a návrh robustní architektury řídicího harnessu pro automatizovaný softwarový vývoj. Postup odpovídá inženýrskému cyklu:
1. *Koncepční analýza*: Systematické zmapování limitů autoregresivních modelů, dynamiky kontextového okna, jevu Context Rot a rozhraní nástrojů.
2. *Architektonický návrh*: Formulace modulárního modelu řídicího harnessu zahrnujícího správu stavu, exekuční pískoviště (sandbox), bezpečnostní pojistky a orchestraci subagentů.
3. *Kritické zhodnocení*: Analýza navržených principů ve srovnání se současnými monolitickými agentními smyčkami a formulace provozních limitů autonomního inženýrství.]


