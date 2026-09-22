#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let bpe_example = example(
  key: "tokenizer_bpe_sennrich",
  title: [Subword BPE],
  source: bib.sennrich2016bpe,
  description: terms => [
Sennrich et al. používají Byte Pair Encoding pro překlad angličtiny do němčiny a ruštiny tak, aby omezený slovník reprezentoval otevřenou slovní zásobu sekvencemi subword jednotek; v analýze uvádějí německý kompozit „Sonnensystem“ složený z „Sonne“ a „System“. #cite(bib.sennrich2016bpe)
  ],
)

#let item = concept(
  key: "tokenizer",
  term: "Tokenizér",
  citation: bib.sennrich2016bpe,
  source: bib.sennrich2016bpe,
  definition: terms => [
Tokenizér je komponenta, která podle slovníku a segmentačních pravidel mapuje vstup na posloupnost diskrétních tokenů a jejich identifikátorů a umožňuje odpovídající zpětné dekódování. #cite(bib.sennrich2016bpe)
  ],
  description: terms => [
Subword tokenizace dělí text na jednotky menší než celé slovo, takže model nepotřebuje samostatnou položku slovníku pro každé možné slovo. BPE postupně slučuje časté sousední jednotky a vytváří omezený slovník, z něhož lze skládat i dříve neviděná slova. #cite(bib.sennrich2016bpe)
  ],
  examples: (bpe_example,),
  practical: terms => [
Zvolená tokenizace určuje, kolik tokenů spotřebují instrukce, historie, zdrojový kód i výsledky nástrojů. Stejný text tak může podle tokenizéru zabírat odlišnou část vstupní nebo výstupní kapacity modelu.
  ],
  relations: (),
)
