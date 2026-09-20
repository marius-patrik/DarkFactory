#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept
#import "react-loop-diagram.typ" as react_loop_diagram

#let terminology = define-term(
    id: "agent-loop",
    proper: translation(cs: "Smyčka ReAct", en: "ReAct Loop"),
    industry: translation(cs: "Agent Loop", en: "Agent Loop"),
    citation: bib.yao2022,
    source: bib.yao2022,
)

#let item = concept(
  key: "agent_loop",
  term: terminology,
  definition: terms => [
Iterativní prováděcí cyklus autonomního agenta založený na vzoru ReAct (_Reasoning + Acting_), v němž model střídá rozhodování, volání nástrojů a vyhodnocování výsledků z běhového prostředí.
  ],
  description: terms => [
Agentní smyčka (_Agent Loop_) představuje výkonné jádro celého agent harnessu. Zatímco pasivní konverzační chatbot jednorázově odpoví na uživatelský dotaz a čeká na další vstup, agentní smyčka autonomně udržuje kontinuální iterativní proces, v němž harness opakovaně vyhodnocuje stav repozitáře, volá jazykový model a vykonává požadované systémové akce.

#diff[
V každé iteraci agentní smyčky harness zajišťuje tyto klíčové funkce:
- Inicializace a správa sezení: Sestavení systémového promptu, dynamická injekce kontextu repozitáře a sledování spotřeby tokenů.
- Běhové prostředí nástrojů: Bezpečné spouštění příkazů v operačním systému a zpětné předávání výstupů modelu.
- Řízení stavových přechodů a vynucování mantinelů (#term(terms.loop_engineering, language: "en", marker: false, linked: false, emphasized: false)): Dohled nad dodržováním procesních pravidel, detekce a zastavení uvíznutých běhů a vynucování lidských schvalovacích bran.
][
Provozní odpovědnosti smyčky jsou odděleny do samostatných konceptů: #term(terms.agent_session), #term(terms.tool_calling), #term(terms.loop_engineering) a #term(terms.guardrail). Samotná agentní smyčka zde popisuje jejich iterativní koordinaci.
]

Vnitřní kognitivní krok modelu uvnitř smyčky se řídí operačním vzorem ReAct (_Reasoning + Acting_) @yao2022, který propojuje rozvahu s přímým jednáním. Tento prováděcí cyklus sestává ze čtyř navazujících fází znázorněných na @fig-react-loop:
1. Rozvaha (_Thought_): Model vyhodnotí aktuální stav kontextu a formuluje svůj nejbližší záměr.
2. Volání nástroje (_Tool Call_): Emitování strukturovaného požadavku na provedení konkrétní akce s určenými parametry.
3. Vykonání a pozorování (_Observation_): Harness bezpečně provede akci v systému a výstup (výpis souboru či chybovou zprávu) vloží zpět do kontextu.
4. Navazující iterace: Model v dalším tahu analyzuje získanou odezvu a rozhoduje o dalším kroku.

Kvalita a provozní spolehlivost celého systému tak závisí v prvé řadě na robustnosti architektury harnessu a spolehlivosti jeho agentní smyčky, nikoliv pouze na samotném jazykovém modelu.

  ],
  summary: terms => [
Agentní smyčka koordinuje opakované rozhodování modelu s vykonáváním akcí; její provozní spolehlivost proto závisí na řízení stavu, nástrojů, rozpočtů a podmínek ukončení.
  ],
  visual: none,
  examples: (),
  attachments: (react_loop_diagram.item,),
  citations: (),
  relations: ((type: "dependency", target: "agent"),),
)