#import "/DarkFactory/templates/common.typ": translation, finalized, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "autoregression",
    czech: "Autoregresivní modelování",
  english: "Autoregressive Modeling",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
definition: terms => [
Autoregresivní modelování je sekvenční postup, při němž model odhaduje následující token podmíněně na předchozí tokeny v aktuální posloupnosti.
  ],
  description: terms => [
#finalized[
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
