#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "kv-cache",
    proper: translation(cs: "Mezipaměť klíčů a hodnot", en: "Key–Value Cache"),
    industry: translation(cs: "KV Cache", en: "KV Cache"),
    citation: bib.dao2022,
    source: bib.ainslie2023,
)

#let item = concept(
  key: "kv_cache",
  term: terminology,
  definition: terms => [
KV Cache je mezipaměť dříve vypočtených vektorů klíčů a hodnot v pozornostních vrstvách transformeru, která při autoregresivním generování omezuje opakovaný výpočet předchozích tokenů.
  ],
  description: terms => [
Při každém novém tokenu lze znovu použít klíče a hodnoty vytvořené pro předchozí část sekvence namísto jejich úplného přepočítání. Mezipaměť tím snižuje výpočetní režii generování, ale její velikost roste s délkou aktivní sekvence a představuje významnou část paměťových nároků inference.
  ],
  summary: terms => [
KV Cache urychluje autoregresivní inferenci výměnou výpočetní práce za paměť, jejíž spotřeba roste s kontextem.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "transformer"),),
)