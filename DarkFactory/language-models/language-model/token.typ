#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "token",
  czech: "Token",
  english: "Token",
  citation: bib.sennrich2016bpe,
  source: bib.sennrich2016bpe,
  definition: terms => [
Diskrétní jednotka vstupní nebo výstupní sekvence reprezentovaná identifikátorem ve slovníku tokenizéru. #cite(bib.sennrich2016bpe)
  ],
  description: terms => [
Token nemusí odpovídat celému slovu; subword tokenizace může pracovat s částmi slov nebo jinými textovými fragmenty. #cite(bib.sennrich2016bpe) Identifikátor tokenu je před zpracováním neuronovou sítí převeden na vektorovou reprezentaci.
  ],
  relations: ((type: "related", target: "tokenizer"),),
)
