#import "../../../templates/common.typ": define-term, translation, unconfirmed, bib
#import "../../schema.typ": concept

#let terminology = define-term(
  id: "autoregression",
  proper: translation(cs: "Autoregresivní modelování", en: "Autoregressive Modeling"),
  explanation_cs: "Způsob sekvenčního modelování, při němž model odhaduje následující token podmíněně na předchozí tokeny v aktuální posloupnosti.",
  explanation_en: "A sequential modeling approach in which a model predicts the next token conditioned on preceding tokens in the current sequence.",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "autoregression",
  term: terminology,
  theory_enabled: true,
  theory_body: terms => [
#unconfirmed[
Autoregresivní generování probíhá iterativně: model zpracuje dosavadní posloupnost tokenů, vypočítá distribuci pravděpodobnosti následujícího tokenu a po jeho výběru celý krok opakuje nad rozšířenou posloupností.
]
  ],
  relations: ((type: "dependency", target: "language_model"),)
)
