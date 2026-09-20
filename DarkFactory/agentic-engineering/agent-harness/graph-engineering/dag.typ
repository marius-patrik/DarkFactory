#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "dag",
    proper: translation(cs: "Orientovaný acyklický graf", en: "Directed Acyclic Graph"),
    industry: translation(cs: "DAG", en: "DAG"),
    citation: bib.wu2023autogen,
    source: bib.wu2023autogen,
)

#let item = concept(
  key: "dag",
  term: terminology,
  definition: terms => [
Orientovaný acyklický graf (DAG) je orientovaný graf bez orientovaného cyklu, který umožňuje explicitně vyjádřit závislosti a pořadí kroků pracovního postupu.
  ],
  description: terms => [
#unconfirmed[
V agentním workflow může DAG modelovat kroky jako uzly a jejich povinné závislosti jako hrany. Tím lze explicitně vyjádřit například posloupnost příjem požadavku → plán → implementace → testy → schválení a zabránit spuštění navazujícího kroku před splněním jeho předpokladů.
]
  ],
  summary: terms => [
DAG převádí implicitní pořadí vícefázové úlohy na kontrolovatelnou strukturu závislostí, v níž lze navazující krok spustit až po splnění jeho předpokladů.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)