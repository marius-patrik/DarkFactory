#import "/DarkFactory/templates/common.typ": define-term, translation
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "thesis-objectives-research-questions",
  proper: translation(cs: "Cíl práce a výzkumné otázky", en: "Thesis Objective and Research Questions"),
  keyword: false,
)

#let item = concept(
  key: "thesis_objectives_research_questions",
  term: terminology,
  definition: terms => [
Cíl práce a výzkumné otázky převádějí motivaci do konkrétního návrhového cíle, dílčích úkolů a otázek, podle nichž lze výsledný systém posoudit.
  ],
  description: terms => [
Hlavní cíl určuje výsledný předmět návrhu. Dílčí cíle rozkládají práci na nezbytné oblasti a výzkumné otázky formulují problémy, které musí architektura a její evaluace zodpovědět.
  ],
  summary: terms => [
Tato struktura propojuje motivaci s metodikou a výsledky: každá část práce má být dohledatelná k některému cíli nebo výzkumné otázce.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
