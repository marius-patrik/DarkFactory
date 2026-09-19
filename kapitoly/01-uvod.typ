#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Úvod

== Motivace a vymezení problému

#unconfirmed[
- *Současný stav automatizace*: Sestavení programu, běh testů, statická analýza i nasazení do produkce jsou dnes plně automatizovány stroji. Úzké hrdlo procesu tvoří samotná modifikace zdrojového kódu — časová prodleva mezi zadáním požadavku a vytvořením otestované změny.
- *Koncept temné továrny (_Dark Factory_)*: Průmyslový model plně automatizovaného provozu běžícího bez stálé lidské obsluhy (není nutné svítit). Cílem není vytlačení člověka (inženýr a konstruktér určují záměr a specifikaci), nýbrž úplná eliminace člověka z mechanických, opakujících se úkonů.
- *Limity stávajících nástrojů na bázi LLM*: Většina stávajících řešení (chatovací asistenti, doplňování kódu) řeší pouze izolovaný krok — návrh fragmentu kódu. Chybí ucelená integrace do vývojového cyklu: kontextové zasazení, exekuce v repozitáři, řešení syntaktických regresí a řízení deterministických záruk.
- *Ústřední inženýrská otázka*: Nezkoumáme triviální otázku, zda jazykový model dokáže napsat fragment kódu, nýbrž jaká kontrolní architektura (*harness*) musí model obklopovat, aby jeho výstupům bylo možné v produkčním repozitáři spolehlivě důvěřovat.
]

== Cíl práce a výzkumné otázky

#unconfirmed[
*Hlavní cíl:*
Vymezit teoretické principy agentního inženýrství (_agentic engineering_) a navrhnout modulární architekturu řídicího harnessu pro automatizovaný vývoj softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.

*Dílčí cíle:*
- Vymezit deterministické základy infrastruktury (správu verzí a kontinuální integraci).
- Analyzovat limity velkých jazykových modelů (dynamiku kontextového okna, jev Context Rot, ztrátovou kompresi a sémantický posun).
- Navrhnout architekturu řídicího harnessu zahrnující nástrojové smyčky (ReAct) s detekcí uvíznutí, rozpočtem tahů a bezpečnostním pískovištěm.
- Formalizovat mechanismy zapojení člověka do smyčky (_Human-in-the-loop_), schvalovací brány a protokol revizních značek pro dohled nad textovými výstupy.

*Výzkumné otázky:*
- *VO1 (Míra automatizace a role člověka)*: Lze vývojový proces od zadání požadavku (GitHub Issue) po pull request strukturovat tak, aby role vývojáře spočívala výhradně v architektonickém dozoru a schvalování záměru (Human Gate), bez nutnosti ručního psaní rutinního kódu?
- *VO2 (Řízení divergence a spolehlivost smyčky)*: Jakými deterministickými mechanismy (stuck detection, rozpočet tahů, circuit breaker) lze v harnessu spolehlivě zabránit patologiím modelu (perseveraci, oscilaci a zacyklení v ReAct smyčce)?
- *VO3 (Integrita paměti a eliminace sémantického posunu)*: Jak spravovat kontextové okno agenta při komplexních úlohách, aby nedocházelo k degradaci pozornosti (Context Rot) a ztrátě architektonických invariantů při kompresi?
]

== Metodika práce

#unconfirmed[
Práce má teoreticko-architektonický a inženýrský charakter. Postup sleduje strukturu inženýrského cyklu:

- *1. Koncepční analýza*: Systematické zmapování limitů autoregresivních modelů, dynamiky kontextového okna, jevu Context Rot a rozhraní nástrojů.
- *2. Architektonický návrh*: Formulace modulárního modelu řídicího harnessu, správy stavu, exekučního pískoviště, bezpečnostních pojistek a orchestrace subagentů.
- *3. Kritické zhodnocení*: Porovnání navržených principů s volnými agentními smyčkami a vymezení provozních limitů autonomního inženýrství.
]
