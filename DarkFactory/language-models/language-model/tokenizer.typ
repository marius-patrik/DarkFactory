#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "tokenizer",
    proper: translation(cs: "Tokenizér", en: "Tokenizer"),
    explanation_cs: "Komponenta, která převádí text nebo jiný vstup na posloupnost tokenů a jejich identifikátorů a podle podporovaného směru také provádí zpětnou dekódovací transformaci.",
    explanation_en: "A component that maps text or another input into a sequence of tokens and token identifiers and, where supported, performs the reverse decoding transformation.",
    citation: bib.sennrich2016bpe,
    source: bib.sennrich2016bpe,
)

#let item = concept(
  key: "tokenizer",
  term: terminology,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)