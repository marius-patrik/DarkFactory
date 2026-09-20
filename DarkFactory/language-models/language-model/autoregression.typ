#import "/DarkFactory/templates/common.typ": define-term, translation, unconfirmed, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "autoregression",
  proper: translation(cs: "Autoregresivní modelování", en: "Autoregressive Modeling"),
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
)

#let item = concept(
  key: "autoregression",
  term: terminology,
  definition: terms => [
Autoregresivní modelování je sekvenční postup, při němž model odhaduje následující token podmíněně na předchozí tokeny v aktuální posloupnosti.
  ],
  description: terms => [
#unconfirmed[
Autoregresivní generování probíhá iterativně: model zpracuje dosavadní posloupnost tokenů, vypočítá distribuci pravděpodobnosti následujícího tokenu a po jeho výběru celý krok opakuje nad rozšířenou posloupností.
]
  ],
  summary: terms => [
Autoregrese vysvětluje, proč generování probíhá po jednotlivých krocích a proč každé nové pokračování závisí na dosavadním kontextu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "language_model"),),
)
