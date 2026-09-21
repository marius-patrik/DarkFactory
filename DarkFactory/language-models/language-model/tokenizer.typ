#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "tokenizer",
  industry: "Tokenizer",
  czech: "Tokenizér",
  english: "Tokenizer",
  citation: bib.sennrich2016bpe,
  source: bib.sennrich2016bpe,
  definition: terms => [
Komponenta, která převádí vstup na posloupnost tokenů a jejich identifikátorů a provádí odpovídající zpětné dekódování. #cite(bib.sennrich2016bpe)
  ],
  description: terms => [
Pravidla tokenizace určují slovník a segmentaci vstupu; subword metody, například Byte Pair Encoding, umožňují skládat text z jednotek menších než celé slovo. #cite(bib.sennrich2016bpe)
  ],
  relations: (),
)
