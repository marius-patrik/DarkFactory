#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_reconciliation",
  industry: "Reconciliation",
  czech: "Rekonciliace stavu",
  english: "State Reconciliation",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Sjednocení trvalého stavu Requestu, pull requestu, projektu a souvisejících workflow po dokončení nebo změně životního cyklu.
  ],
  description: terms => [
DarkFactory používá kanonické stavy Backlog, ToDo, In Progress, Blocked, Done, Superseded a Dropped a po terminálních událostech aktualizuje navázaný trvalý stav podle skutečně dosaženého výsledku.
  ],
  relations: ((type: "dependency", target: "github_control_plane"), (type: "related", target: "pull_request")),
)
