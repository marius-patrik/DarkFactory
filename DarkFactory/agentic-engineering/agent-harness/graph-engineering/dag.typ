#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "dag",
    proper: translation(cs: "Orientovaný acyklický graf", en: "Directed Acyclic Graph"),
    industry: translation(cs: "DAG", en: "DAG"),
    explanation_cs: "Orientovaný graf bez orientovaného cyklu. V pracovních postupech umožňuje explicitně vyjádřit závislosti mezi kroky a pořadí, které z nich vyplývá.",
    explanation_en: "A directed graph containing no directed cycle. In workflows it can explicitly represent dependencies among steps and the ordering implied by those dependencies.",
    citation: bib.wu2023autogen,
    source: bib.wu2023autogen,
)

#let item = concept(
  key: "dag",
  term: terminology,
  definition: none,
  description: terms => [
#unconfirmed[
V agentním workflow může DAG modelovat kroky jako uzly a jejich povinné závislosti jako hrany. Tím lze explicitně vyjádřit například posloupnost příjem požadavku → plán → implementace → testy → schválení a zabránit spuštění navazujícího kroku před splněním jeho předpokladů.
]
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)