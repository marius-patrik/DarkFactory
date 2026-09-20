#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "progressive-disclosure",
  proper: translation(cs: "Postupné zpřístupňování kontextu", en: "Progressive Disclosure"),
  industry: translation(cs: "Progressive Disclosure", en: "Progressive Disclosure"),
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
)

#let item = concept(
  key: "progressive_disclosure",
  term: terminology,
  definition: terms => [
Postupné zpřístupňování je strategie, při níž se do aktivního kontextu nejprve vkládají pouze stručné popisy schopností a podrobné instrukce se načtou až při jejich použití.
  ],
  description: terms => [
#unconfirmed[
U dovedností snižuje postupné zpřístupňování kontextovou režii: základní prompt obsahuje pouze přehled dostupných dovedností a úplný obsah příslušného `SKILL.md` se načte až tehdy, když jej agent pro konkrétní úlohu potřebuje.
]
  ],
  summary: terms => [
Do aktivního kontextu se dostávají pouze právě potřebné instrukce, čímž se omezuje režie bez ztráty dostupnosti specializovaných postupů.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "skills"), (type: "related", target: "context_engineering")),
)
