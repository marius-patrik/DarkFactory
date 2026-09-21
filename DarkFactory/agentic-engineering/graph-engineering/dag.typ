#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "dag",
    industry: "DAG",
  czech: "Orientovaný acyklický graf",
  english: "Directed Acyclic Graph",
  citation: bib.wu2023autogen,
  source: bib.wu2023autogen,
definition: terms => [
Orientovaný graf bez orientovaného cyklu, který umožňuje explicitně vyjádřit závislosti a pořadí kroků pracovního postupu.
  ],
  description: terms => [
#finalized[
V agentním workflow reprezentuje DAG kroky jako uzly a jejich závislosti jako hrany, takže navazující krok může začít až po splnění svých předpokladů.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)