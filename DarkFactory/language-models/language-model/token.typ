#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let subword_token_example = example(
  key: "token_subword_sennrich",
  title: [Token pod úrovní slova],
  source: bib.sennrich2016bpe,
  description: terms => [
Subword přístup Sennricha et al. reprezentuje vzácná a neznámá slova jako posloupnost menších jednotek namísto jediné položky celého slova; rozbor německých kompozit, například „Sonnensystem“ („Sonne“ + „System“), ukazuje, proč token nemusí odpovídat jednomu slovu. #cite(bib.sennrich2016bpe)
  ],
)

#let item = concept(
  key: "token",
  keyword: "Token",
  citation: (bib.sennrich2016bpe, bib.vaswani2017),
  source: bib.sennrich2016bpe,
  definition: terms => [
Token je diskrétní jednotka sekvence identifikovaná položkou slovníku tokenizéru; podle tokenizační metody může odpovídat celému slovu, části slova nebo jinému textovému fragmentu. #cite(bib.sennrich2016bpe)
  ],
  description: terms => [
Token se od tokenizéru liší tím, že je výslednou sekvenční jednotkou, zatímco tokenizér určuje pravidla jejího vzniku. Před vstupem do vrstev Transformeru se identifikátory vstupních tokenů mapují na spojité naučené vektory. #cite(bib.vaswani2017)
  ],
  examples: (subword_token_example,),
  practical: terms => [
Tokeny jsou jednotkou, podle níž se vyjadřuje délka aktivního kontextu a generovaného výstupu. Agentní systém proto musí sledovat, kolik tokenů zabírají instrukce, historie, data i nástrojové výsledky.
  ],
  relations: ((type: "related", target: "tokenizer"),),
)
