#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "token",
    czech: "Token",
  english: "Token",
  citation: bib.sennrich2016bpe,
  source: bib.sennrich2016bpe,
definition: terms => [
Token je diskrétní jednotka zpracovávaná jazykovým modelem, odpovídající položce slovníku tokenizéru a reprezentovaná číselným identifikátorem.
  ],
  description: terms => [
Token nemusí odpovídat celému slovu; podle použitého tokenizéru může představovat slovo, část slova, znakový fragment nebo jinou jednotku. Po tokenizaci jsou identifikátory převedeny na vektorové reprezentace, se kterými pracují vrstvy modelu.
  ],
  summary: terms => [
Token je základní diskrétní jednotka modelového vstupu a výstupu a současně jednotka, podle níž se prakticky měří velikost kontextu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)