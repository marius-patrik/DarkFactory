#import "../templates/registry.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw

= #finalized[Úvod]

== #finalized[Motivace a vymezení problému]

#unconfirmed[
V moderním softwarovém inženýrství dosáhla automatizace vysokého stupně zralosti. Sestavení zdrojových kódů, běh testovacích sad, statická analýza i nasazování do produkce probíhají běžně bez nutnosti lidského zásahu. Hlavním úzkým hrdlem celého vývojového procesu tak zůstává samotná tvorba a modifikace zdrojového kódu — časová prodleva mezi zadáním nového požadavku v podobě úkolu či hlášení chyby a vytvořením otestované, bezpečně začlenitelné změny.

Inspirací pro překonání tohoto omezení je průmyslový koncept *temné továrny* (_Dark Factory_) — plně automatizovaného výrobního provozu, který funguje samostatně bez nutnosti stálé přítomnosti lidské obsluhy. Cílem tohoto přístupu není vytlačení lidského inženýra, nýbrž posun jeho role: člověk definuje záměr, architekturu a funkční specifikaci, zatímco mechanické, rutinní a opakující se úkony přebírají autonomní systémy.

Nástup velkých jazykových modelů (LLM) otevřel cestu k automatizaci syntézy kódu, avšak stávající nástroje vykazují zásadní limity. Většina současných řešení (konverzační asistenti a doplňování kódu v editoru) řeší pouze izolovaný krok v podobě návrhu textového fragmentu. Chybí jim hlubší integrace do vývojového cyklu repozitáře: přímá práce se souborovým systémem, schopnost interpretovat výstupy překladače, iterativně odstraňovat syntaktické regrese a respektovat deterministická pravidla projektu.

]

#finalized[
Ústřední inženýrská otázka této práce proto nespočívá v tom, zda jazykový model dokáže napsat fragment kódu. Zkoumáme, jaká kontrolní a dozorčí architektura — značovaná jako *agent harness* — musí model obklopovat, aby bylo možné jeho výstupům v produkčním repozitáři spolehlivě důvěřovat a dosáhnout vysoké míry autonomie se zachováním lidského dohledu.
]

== #finalized[Cíl práce a výzkumné otázky]

=== #finalized[Hlavní cíl]

#finalized[
Vymezit teoretické principy agentického inženýrství (_agentic engineering_) a navrhnout modulární architekturu agent harnessu pro automatizovaný vývoj softwaru se zachováním lidského dohledu v klíčových rozhodovacích bodech.
]

=== #finalized[Dílčí cíle]

#accepted[
- Vymezit infrastrukturu pro správu verzí (Git, GitHub a kontinuální integraci).
- Analyzovat limity velkých jazykových modelů (dynamiku kontextového okna, jev Context Rot, ztrátovou kompresi a sémantický posun).
- Navrhnout architekturu agent harnessu zahrnující nástrojové smyčky (ReAct), bezpečnostní pískoviště a hierarchickou orchestraci subagentů.
- Formalizovat mechanismy zapojení člověka do smyčky (_Human-in-the-loop_), schvalovací brány a protokol revizních značek pro dohled nad textovými výstupy.
]

=== #finalized[Výzkumné otázky]

#unconfirmed[
- *VO1 (Míra automatizace a role člověka)*: Lze vývojový proces od zadání požadavku (GitHub Issue) po pull request strukturovat tak, aby role vývojáře spočívala výhradně v architektonickém dozoru a schvalování záměru (Human Gate), bez nutnosti ručního psaní rutinního kódu?
- *VO2 (Řízení divergence a spolehlivost smyčky)*: Jakými architektonickými mechanismy lze v harnessu spolehlivě zabránit patologiím modelu (perseveraci, oscilaci a zacyklení v ReAct smyčce)?
- *VO3 (Integrita paměti a eliminace sémantického posunu)*: Jak spravovat kontextové okno agenta při komplexních úlohách, aby nedocházelo k degradaci pozornosti (Context Rot) a ztrátě architektonických invariantů při kompresi?
]

#critique[
  *Oponentura k výzkumným otázkám:*
  Otázka VO1 je formulována binárně („Lze vývojový proces strukturovat...“), což svádí k tautologické odpovědi. Rigorózní oponent bude žádat empirické vymezení: Jaké procento rutinních úloh (např. oprava chyby se selhávajícím testem vs. komplexní refaktoring) harness reálně odbaví bez ručního zásahu do kódu? Doporučujeme otázku v obhajobě doplnit o kritérium mezní složitosti úkolu a míry redukce kognitivní zátěže člověka.
]

== #finalized[Metodika práce]

#accepted[
Práce má teoreticko-architektonický a inženýrský charakter. Vzhledem k dynamickému vývoji v oblasti autonomního softwarového vývoje práce důsledně zachovává a integruje zavedené anglické odborné názvy (např. _harness_, _pull request_, _agent loop_, _prompt engineering_, _skills_ či _context rot_). Použití této terminologie je integrální součástí práce, neboť tyto anglické pojmy představují de facto celosvětové průmyslové standardy (_industry standards_), jejichž doslovný český překlad by byl nejednoznačný, zavádějící či v rozporu s běžnou inženýrskou praxí.

Postup práce sleduje strukturu inženýrského cyklu:

- *1. Analýza konceptu*: Systematické zmapování limitů autoregresivních modelů, dynamiky kontextového okna, jevu Context Rot a rozhraní nástrojů.
- *2. Návrh architektury*: Formulace modulárního modelu agent harnessu, správy stavu, exekučního pískoviště, bezpečnostních pojistek a orchestrace subagentů.
- *3. Kritické zhodnocení*: Porovnání navržených principů s volnými agentními smyčkami a vymezení provozních limitů autonomního inženýrství.
]

#alert[
  *Chybějící evaluační rámec v metodice:*
  Metodika práce v současné podobě popisuje inženýrský postup, ale postrádá formální specifikaci evaluačního rámce: definici vzorku úloh pro ověření spolehlivosti (syntetické úlohy vs. reálné bugfixy), stanovení kontrolních metrik (úspěšnost na první pokus, spotřeba tokenů na úspěšný PR) a srovnávací baseline.
]
