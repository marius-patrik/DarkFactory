#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "tokenizer",
    proper: translation(cs: "Tokenizér", en: "Tokenizer"),
    explanation_cs: "Komponenta, která převádí text nebo jiný vstup na posloupnost tokenů a jejich identifikátorů a podle podporovaného směru také provádí zpětnou dekódovací transformaci.",
    explanation_en: "A component that maps text or another input into a sequence of tokens and token identifiers and, where supported, performs the reverse decoding transformation.",
  )

#let item = concept(
  key: "tokenizer",
  term: terminology,
  heading: terms => [#term(terms.tokenizer, marker: false, linked: false, emphasized: false)],
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
  related: (),
)
