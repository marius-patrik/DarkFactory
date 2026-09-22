#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let original_transformer_example = example(
  key: "transformer_original_architecture",
  title: [Původní Transformer],
  source: bib.vaswani2017,
  description: terms => [
Vaswani et al. demonstrují Transformer na strojovém překladu: enkodér i dekodér skládají vrstvy pozornosti a dopředných sítí, přičemž maskovaná self-attention v dekodéru brání přístupu k budoucím pozicím během autoregresivní predikce. #cite(bib.vaswani2017)
  ],
)

#let item = concept(
  key: "transformer",
  keyword: "Transformer",
  citation: bib.vaswani2017,
  source: bib.vaswani2017,
  definition: terms => [
Transformer je architektura neuronové sítě, která zpracovává vztahy v sekvenci pomocí mechanismů pozornosti místo rekurence či konvoluce jako základního mechanismu pro přenos informace mezi pozicemi. #cite(bib.vaswani2017)
  ],
  description: terms => [
Původní architektura Transformer má enkodér a dekodér; autoregresivní chování vzniká v dekodéru maskováním přístupu k budoucím tokenům a postupným vytvářením dalšího výstupu. Transformer tedy není synonymem pro autoregresivní LLM, ale jeho pozornostní mechanismus tvoří základ zpracování aktivního kontextu v mnoha současných jazykových modelech. #cite(bib.vaswani2017)
  ],
  examples: (original_transformer_example,),
  practical: terms => [
Pozornost umožňuje, aby výpočet dalšího výstupu podmiňovaly informace z aktivního kontextu. Informace, které mají přetrvat mezi inferenčními běhy nebo mimo dostupný kontext, však musí udržovat okolní systém.
  ],
  relations: (),
)
