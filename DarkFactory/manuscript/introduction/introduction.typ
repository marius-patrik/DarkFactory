#import "/DarkFactory/templates/common.typ": define-term, translation
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "thesis-introduction",
  proper: translation(cs: "Úvod", en: "Introduction"),
  keyword: false,
)

#let item = concept(
  key: "thesis_introduction",
  term: terminology,
  definition: terms => [
Úvod vymezuje důvod, cíl a metodický rozsah práce zaměřené na současné agentní systémy a agentní harness.
  ],
  description: terms => [
Následující koncepty postupně formulují motivaci práce, hlavní a dílčí cíle, výzkumné otázky a metodiku. Tím stanovují problém, který má návrh DarkFactory řešit, i hranice témat, která práce záměrně nepokrývá.
  ],
  summary: terms => [
Úvod vytváří rámec pro posouzení, zda navržená architektura odpovídá deklarovanému cíli a výzkumným otázkám.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
