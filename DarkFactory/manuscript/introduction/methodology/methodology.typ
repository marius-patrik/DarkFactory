#import "/DarkFactory/templates/common.typ": define-term, translation, term
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "methodology",
  proper: translation(cs: "Metodika práce", en: "Methodology"),
  keyword: false,
)

#let item = concept(
  key: "methodology",
  term: terminology,
  definition: terms => [
Práce používá konceptově-analytický a inženýrský postup: vymezuje nezbytné části agentního systému, popisuje jejich vztahy a ověřuje je na návrhu a realizaci systému DarkFactory.
  ],
  description: terms => [
Předmětem práce není trénování neuronových sítí, optimalizace vah ani podrobná matematika modelového učení. #term(terms.language_model) je zde chápán jako hotová inferenční komponenta. Modelová vrstva je proto popsána pouze v rozsahu nutném pro pochopení agentního běhu, tokenizace, kontextového okna, paměťového stavu inference a nástrojových rozhraní.

Hlavním předmětem zkoumání je #term(terms.agentic_engineering) a konstrukce #term(terms.harness) pro autonomní softwarové inženýrství. Jednotlivé mechanismy jsou rozděleny do samostatných konceptů, aby každý pojem měl jedno místo pro definici, popis a shrnutí a aby se stejné vysvětlení neopakovalo v několika kapitolách.

Postup práce má tři kroky: nejprve jsou vymezeny relevantní koncepty a jejich závislosti; následně jsou tyto principy promítnuty do architektury DarkFactory; nakonec jsou vlastnosti výsledného systému posouzeny podle ověřitelných výstupů vývojového procesu. Terminologie zachovává zavedené oborové názvy tam, kde jsou v praxi přesnější než doslovný překlad, přičemž všechny používané termíny jsou vedeny jako kanonické koncepty.
  ],
  summary: terms => [
Rozsah práce je záměrně soustředěn na agentní systém kolem modelu: model je vstupní inferenční komponenta, zatímco předmětem návrhu a hodnocení je harness a jeho provozní mechanismy.
  ],
  relations: (
    (type: "dependency", target: "thesis_objectives_research_questions"),
    (type: "related", target: "language_model"),
    (type: "related", target: "agentic_engineering"),
    (type: "related", target: "harness"),
  ),
)
