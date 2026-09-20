#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "kv-cache",
    proper: translation(cs: "Mezipaměť klíčů a hodnot", en: "Key–Value Cache"),
    industry: translation(cs: "KV Cache", en: "KV Cache"),
    explanation_cs: "Mezipaměť dříve vypočtených vektorů klíčů a hodnot v pozornostních vrstvách transformeru, která při autoregresivním generování omezuje nutnost opakovaně přepočítávat předchozí tokeny.",
    explanation_en: "A cache of previously computed key and value vectors in transformer attention layers that reduces repeated computation of earlier tokens during autoregressive generation.",
    citation: bib.dao2022,
    source: bib.ainslie2023,
)

#let item = concept(
  key: "kv_cache",
  term: terminology,
  heading: terms => [#term(terms.kv_cache, marker: false, linked: false, emphasized: false)],
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "transformer"),)
)