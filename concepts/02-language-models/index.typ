#import "../../templates/common.typ": define-term, translation
#import "../schema.typ": section
#import "agent.typ" as agent
#import "token.typ" as token
#import "turn.typ" as turn
#import "compaction.typ" as compaction
#import "semantic-drift.typ" as semantic_drift
#import "rag.typ" as rag
#import "context-rot.typ" as context_rot
#import "language-model.typ" as language_model
#import "chatbot.typ" as chatbot
#import "tokenizer.typ" as tokenizer
#import "embedding.typ" as embedding
#import "transformer.typ" as transformer
#import "kv-cache.typ" as kv_cache
#import "context-window.typ" as context_window

#let terminology = define-term(id: "language-models-chatbots-agents", proper: translation(cs: "Jazykové modely, chatboti a agenti", en: "Language Models, Chatbots, and Agents"), explanation_cs: "Konceptuální minimum o jazykových modelech a jejich kontextu potřebné pro pochopení agentních systémů.", explanation_en: "The conceptual minimum about language models and their context needed to understand agentic systems.", keyword: false)

#let item = section(
  key: "language_models",
  term: terminology,
  heading: terms => [#finalized[#term(terms.language_model, name-type: "industry", language: "en", marker: false, linked: false, emphasized: false), chatboti a agenti]],
  theory_prelude: terms => [
#blue-note[
  Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je agentické inženýrství (_agentic engineering_) a architektura agent harnessu pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]
  ],
  theory_intro_heading: terms => [#finalized[Úvod]],
  theory_intro: terms => [
#accepted[
V agentickém softwarovém inženýrství vystupuje velký jazykový model (LLM) jako stochastické kognitivní jádro celého systému. Z hlediska vnitřní architektury se jedná o dekodérový transformer (_Decoder-only_), jehož typickými představiteli jsou moderní modely řad Claude, GPT či DeepSeek @vaswani2017. Role modelu nespočívá ve vystupování jako vševědoucí orákulum se spolehlivou znalostí okolního světa, nýbrž jako pokročilý generátor hypotéz, kódu a strukturovaných volání nástrojů řízený obdrženým kontextem.

Základní principy fungování modelu zahrnují:
- Autoregresivní predikce: Model zpracovává zadanou sekvenci textu a na jejím základě iterativně předpovídá nejpravděpodobnější následující symboly (tokeny).
- Stochastická povaha: Vzhledem k pravděpodobnostnímu vzorkování může model na totožný vstup reagovat mírně odlišně, což vyžaduje deterministické mantinely v nadřazeném agent harnessu.

Pro efektivní nasazení modelu do vývojového cyklu je nezbytné porozumět způsobu, jakým reprezentuje informace a jaké fyzické limity vymezují jeho operační paměť.
]
  ],
  theory_summary: none,
  practical_prelude: none,
  practical_intro_heading: none,
  practical_intro: none,
  practical_summary: none,
  practical_grouped: false,
  concepts: (
    agent.item,
    token.item,
    turn.item,
    compaction.item,
    semantic_drift.item,
    rag.item,
    context_rot.item,
    language_model.item,
    chatbot.item,
    tokenizer.item,
    embedding.item,
    transformer.item,
    kv_cache.item,
    context_window.item,
  ),
)
