#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "progressive-disclosure",
  proper: translation(cs: "Postupné zpřístupňování kontextu", en: "Progressive Disclosure"),
  industry: translation(cs: "Progressive Disclosure", en: "Progressive Disclosure"),
  explanation_cs: "Strategie, při níž se do aktivního kontextu nejprve vkládají pouze stručné popisy dostupných schopností a podrobné instrukce se načtou až při jejich použití.",
  explanation_en: "A strategy where only compact capability descriptions are initially placed in active context and detailed instructions are loaded only when needed.",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
)

#let item = concept(
  key: "progressive_disclosure",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
U dovedností snižuje postupné zpřístupňování kontextovou režii: základní prompt obsahuje pouze přehled dostupných dovedností a úplný obsah příslušného `SKILL.md` se načte až tehdy, když jej agent pro konkrétní úlohu potřebuje.
]
  ],
  relations: ((type: "dependency", target: "skills"), (type: "related", target: "context_engineering"))
)
