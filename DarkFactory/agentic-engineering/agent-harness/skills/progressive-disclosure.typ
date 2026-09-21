#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "progressive_disclosure",
    industry: "Progressive Disclosure",
  czech: "Postupné zpřístupňování kontextu",
  english: "Progressive Disclosure",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
definition: terms => [
Postupné zpřístupňování je strategie, při níž se do aktivního kontextu nejprve vkládají pouze stručné popisy schopností a podrobné instrukce se načtou až při jejich použití.
  ],
  description: terms => [
#finalized[
U dovedností snižuje postupné zpřístupňování kontextovou režii: základní prompt obsahuje pouze přehled dostupných dovedností a úplný obsah příslušného `SKILL.md` se načte až tehdy, když jej agent pro konkrétní úlohu potřebuje.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "skills"), (type: "related", target: "context_engineering")),
)
