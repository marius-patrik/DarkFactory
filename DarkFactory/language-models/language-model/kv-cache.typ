#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "kv_cache",
    industry: "KV Cache",
  czech: "Mezipaměť klíčů a hodnot",
  english: "Key–Value Cache",
  citation: bib.dao2022,
  source: bib.ainslie2023,
definition: terms => [
Mezipaměť dříve vypočtených vektorů klíčů a hodnot v pozornostních vrstvách transformeru, která při autoregresivním generování omezuje opakovaný výpočet předchozích tokenů.
  ],
  description: terms => [
Při každém novém tokenu lze znovu použít klíče a hodnoty vytvořené pro předchozí část sekvence namísto jejich úplného přepočítání. Mezipaměť tím snižuje výpočetní režii generování, ale její velikost roste s délkou aktivní sekvence a představuje významnou část paměťových nároků inference.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "transformer"),),
)