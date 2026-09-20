#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "agent-loop",
    proper: translation(cs: "Smyčka ReAct", en: "ReAct Loop"),
    industry: translation(cs: "Agent Loop", en: "Agent Loop"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Iterativní prováděcí cyklus autonomního agenta založený na vzoru ReAct (Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.",
    explanation_en: "An iterative execution cycle of an autonomous agent based on the ReAct pattern (Reasoning + Acting), in which the model alternates between reasoning, tool calls, and evaluation of observations from the runtime environment.",
    citation: bib.yao2022,
    source: bib.yao2022,
)

#let item = concept(
  key: "agent_loop",
  term: terminology,
  heading: terms => [#finalized[#term(terms.agent_loop, name-type: "both", name-separator: "bar", name-type-separator: "paren", marker: false, linked: false, emphasized: false)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Agentní smyčka (_Agent Loop_) představuje výkonné jádro celého agent harnessu. Zatímco pasivní konverzační chatbot jednorázově odpoví na uživatelský dotaz a čeká na další vstup, agentní smyčka autonomně udržuje kontinuální iterativní proces, v němž harness opakovaně vyhodnocuje stav repozitáře, volá jazykový model a vykonává požadované systémové akce.

V každé iteraci agentní smyčky harness zajišťuje tyto klíčové funkce:
- Inicializace a správa sezení: Sestavení systémového promptu, dynamická injekce kontextu repozitáře a sledování spotřeby tokenů.
- Běhové prostředí nástrojů: Bezpečné spouštění příkazů v operačním systému a zpětné předávání výstupů modelu.
- Řízení stavových přechodů a vynucování mantinelů (#term(terms.loop_engineering, language: "en", marker: false, linked: false, emphasized: false)): Dohled nad dodržováním procesních pravidel, detekce a zastavení uvíznutých běhů a vynucování lidských schvalovacích bran.

Vnitřní kognitivní krok modelu uvnitř smyčky se řídí operačním vzorem ReAct (_Reasoning + Acting_) @yao2022, který propojuje rozvahu s přímým jednáním. Tento prováděcí cyklus sestává ze čtyř navazujících fází znázorněných na @fig-react-loop:
1. Rozvaha (_Thought_): Model vyhodnotí aktuální stav kontextu a formuluje svůj nejbližší záměr.
2. Volání nástroje (_Tool Call_): Emitování strukturovaného požadavku na provedení konkrétní akce s určenými parametry.
3. Vykonání a pozorování (_Observation_): Harness bezpečně provede akci v systému a výstup (výpis souboru či chybovou zprávu) vloží zpět do kontextu.
4. Navazující iterace: Model v dalším tahu analyzuje získanou odezvu a rozhoduje o dalším kroku.

Kvalita a provozní spolehlivost celého systému tak závisí v prvé řadě na robustnosti architektury harnessu a spolehlivosti jeho agentní smyčky, nikoliv pouze na samotném jazykovém modelu.
  ],
  theory_summary: none,
  theory_after: terms => [
#figure(
  image("/img/react-loop.svg", width: 100%),
  caption: [#finalized[Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.]],
) <fig-react-loop>
  ],
  theory_wrapper: finalized,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "agent"),)
)