#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "compaction",
  term: "Kompakce kontextu",
  keyword: "Context Compaction",
  citation: (bib.anthropic_context_engineering, bib.jiang2023llmlingua),
  source: bib.anthropic_context_engineering,
  definition: terms => [
Zmenšení aktivního kontextu nahrazením části historie kratší reprezentací, typicky shrnutím nebo výběrem důležitých informací. #cite(bib.anthropic_context_engineering)
  ],
  description: terms => [
Kompakce uvolňuje kapacitu pro další běh, ale příliš agresivní komprese může odstranit detaily, které se později ukážou jako důležité. #cite(bib.anthropic_context_engineering) #cite(bib.jiang2023llmlingua)
  ],
  relations: ((type: "dependency", target: "context_engineering"),),
)
