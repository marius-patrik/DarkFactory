#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "tokenizer",
    czech: "Tokenizér",
  english: "Tokenizer",
  citation: bib.sennrich2016bpe,
  source: bib.sennrich2016bpe,
definition: terms => [
Tokenizér je komponenta, která převádí text nebo jiný podporovaný vstup na posloupnost tokenů a jejich identifikátorů a provádí odpovídající zpětné dekódování.
  ],
  description: terms => [
Konkrétní tokenizér určuje slovník i pravidla rozdělení vstupu, často pomocí subword metod, jako je Byte Pair Encoding. Stejný text proto může mít u různých modelových rodin odlišný počet tokenů a jinou segmentaci.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)