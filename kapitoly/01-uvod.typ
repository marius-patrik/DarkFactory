#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Úvod

== Motivace a vymezení problému

#unconfirmed[
Vývoj softwaru se za posledních dvacet let z velké části zautomatizoval. Sestavení programu, spuštění testů, kontrola stylu i nasazení do provozu dnes obstarávají stroje a nikdo je nepovažuje za práci hodnou lidského času. Jeden krok však dlouho zůstával výhradně ruční: samotná změna zdrojového kódu. Právě tam vzniká většina časových prodlev — v intervalu mezi okamžikem, kdy vývojář či zákazník formuluje požadavek, a okamžikem, kdy se otestovaná změna dostane k uživatelům.

Výrobní průmysl pro vysoce automatizované provozy zavedl pojem _dark factory_ („temná továrna“) — výrobní halu pracující bez lidské obsluhy, v níž není nutné svítit. Smyslem tohoto konceptu není naprosté vytlačení člověka (i temná továrna vyžaduje inženýry a konstruktéry, kteří určují, co a proč se má vyrábět), nýbrž eliminace člověka z mechanicky se opakujících úkonů.

S příchodem velkých jazykových modelů se otevřela cesta k uplatnění téhož principu v softwarovém inženýrství. Většina současných nástrojů však řeší pouze izolovaný krok: vygenerují návrh změny kódu, který musí člověk manuálně zasadit do kontextu, spustit v lokálním prostředí a vyřešit případné syntaktické regrese. V teorii i praxi dosud chybí ucelený popis toho, jak má autonomní agent zapadnout do celého vývojového cyklu — kdo a na základě jakých podkladů schvaluje jeho záměr, jaké deterministické záruky zabrání rozpadu procesu při selhání modelu a jakým způsobem se objektivně ověřuje správnost výsledku. Předmětem této práce proto není triviální otázka, zda jazykový model dokáže napsat fragment kódu, nýbrž otázka, jaká kontrolní architektura (harness) musí model obklopovat, aby jeho výstupům bylo možné v produkčním repozitáři důvěřovat.
]

== Cíl práce a výzkumné otázky

#unconfirmed[
Cílem práce je představit teoretické principy agentního inženýrství (_agentic engineering_) a navrhnout architekturu řídicího harnessu pro automatizovaný softwarový vývoj, který provede vývojový požadavek celým životním cyklem od zadání po ověřenou změnu, aniž by se vzdal lidského dohledu v klíčových rozhodovacích bodech.

Dílčí cíle:
+ Popsat současný stav automatizace softwarového vývoje a vymezit deterministické základy (správu verzí a kontinuální integraci).
+ Analyzovat principy agentního inženýrství a limity velkých jazykových modelů (dynamika kontextového okna, jev Context Rot, ztrátová komprese a sémantický posun).
+ Navrhnout modulární architekturu řídicího harnessu zahrnující nástrojové smyčky (ReAct) s deterministickou detekcí uvíznutí, rozpočtem tahů a bezpečnostními pískovišti.
+ Vymezit mechanismy zapojení člověka do smyčky (_Human-in-the-loop_), formalizovat schvalovací brány a navrhnout protokol revizních značek pro dohled nad textovými výstupy.

V návaznosti na stanovené cíle práce zkoumá tři klíčové inženýrské výzkumné otázky:
- *VO1 (Míra automatizace a role člověka)*: Lze vývojový proces od zadání požadavku (GitHub Issue) po vytvoření funkčního pull requestu strukturovat tak, aby role vývojáře spočívala v architektonickém dozoru a schvalování záměru (Human Gate), aniž by musel sám psát kód nebo řešit syntaktické regrese?
- *VO2 (Řízení divergence a spolehlivost smyčky)*: Jakými deterministickými mechanismy (stuck detection, rozpočet tahů, circuit breaker) lze v řídicím harnessu zabránit patologiím jazykových modelů, jako je perseverace, oscilace či nekonečné zacyklení v ReAct smyčce?
- *VO3 (Integrita paměti a eliminace sémantického posunu)*: Jakými postupy lze efektivně spravovat kontextové okno agenta při komplexních úlohách, aby nedocházelo k degradaci pozornosti (Context Rot) a destruktivní ztrátě architektonických invariantů při rekurzivní kompresi?
]

== Metodika práce

#unconfirmed[
Práce je z povahy tématu teoreticko-architektonická a inženýrská: primárním výstupem je formulace principů agentního inženýrství a návrh robustní architektury řídicího harnessu pro automatizovaný softwarový vývoj. Postup odpovídá inženýrskému cyklu:
1. *Koncepční analýza*: Systematické zmapování limitů autoregresivních modelů, dynamiky kontextového okna, jevu Context Rot a rozhraní nástrojů.
2. *Architektonický návrh*: Formulace modulárního modelu řídicího harnessu zahrnujícího správu stavu, exekuční pískoviště (sandbox), bezpečnostní pojistky a orchestraci subagentů.
3. *Kritické zhodnocení*: Analýza navržených principů ve srovnání se současnými monolitickými agentními smyčkami a formulace provozních limitů autonomního inženýrství.
]
