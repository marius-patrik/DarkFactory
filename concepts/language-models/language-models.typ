#import "../../templates/common.typ": define-term, translation, blue-note, accepted, finalized, term, bib
#import "../schema.typ": concept

#let terminology = define-term(
  id: "language-models-chatbots-agents",
  proper: translation(cs: "Jazykové modely, chatboti a agenti", en: "Language Models, Chatbots, and Agents"),
  explanation_cs: "Konceptuální minimum o jazykových modelech a jejich kontextu potřebné pro pochopení agentních systémů.",
  explanation_en: "The conceptual minimum about language models and their context needed to understand agentic systems.",
  keyword: false,
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "language_models",
  term: terminology,
  theory_enabled: true,
  theory_intro: terms => [
#blue-note[
Těžištěm této práce není strojové učení, matematická optimalizace vah ani trénování neuronových sítí. Jazykový model vnímáme jako hotovou inferenční komponentu vystupující v roli stochastického kognitivního jádra. Ústředním předmětem zkoumání je agentické inženýrství (_agentic engineering_) a architektura agent harnessu pro autonomní vývoj softwaru. Následující text je proto záměrně zredukován na nezbytné konceptuální minimum potřebné pro pochopení kontextového okna, spotřeby tokenů, degradace pozornosti a rozhraní nástrojů.
]

#accepted[
V agentickém softwarovém inženýrství vystupuje velký jazykový model (LLM) jako stochastické kognitivní jádro celého systému. Z hlediska vnitřní architektury se jedná o dekodérový transformer (_Decoder-only_; #term(terms.transformer, language: "en", marker: false, linked: false, emphasized: false)), jehož typickými představiteli jsou moderní modely řad Claude, GPT či DeepSeek @vaswani2017. Role modelu nespočívá ve vystupování jako vševědoucí orákulum se spolehlivou znalostí okolního světa, nýbrž jako pokročilý generátor hypotéz, kódu a strukturovaných volání nástrojů řízený obdrženým kontextem.

Základní principy fungování modelu zahrnují:
- Autoregresivní predikce: Model zpracovává zadanou sekvenci textu a na jejím základě iterativně předpovídá nejpravděpodobnější následující symboly (tokeny).
- Stochastická povaha: Vzhledem k pravděpodobnostnímu vzorkování může model na totožný vstup reagovat mírně odlišně, což vyžaduje deterministické mantinely v nadřazeném agent harnessu.

Pro efektivní nasazení modelu do vývojového cyklu je nezbytné porozumět způsobu, jakým reprezentuje informace a jaké fyzické limity vymezují jeho operační paměť.
]
  theory_body: none,
  ],
  practical_enabled: false,
)