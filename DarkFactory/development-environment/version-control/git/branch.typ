#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "branch",
    industry: "Branch",
  czech: "Větev repozitáře",
  english: "Repository Branch",
  citation: bib.chacon2014,
  source: bib.chacon2014,
definition: terms => [
Větev je pojmenovaná vývojová linie v systému správy verzí, která umožňuje provádět změny odděleně od jiné linie historie a později je porovnat nebo sloučit.
  ],
  description: terms => [
#finalized[
V navrženém procesu DarkFactory agent nepracuje přímo v hlavní větvi. Každý úkol provádí v samostatné pracovní větvi odvozené ze základní linie projektu @chacon2014.

Tento postup přináší několik praktických vlastností:
- Ochrana hlavní větve: změny se do `main` začleňují až přes definovaný integrační proces.
- Samostatná větev pro každý úkol: pracovní historie jednoho zadání je oddělena od ostatních běhů.
- Izolace mezistavů: dočasně nefunkční nebo experimentální změny zůstávají mimo hlavní větev.
- Snadné zahození neúspěšného běhu: pracovní větev lze odstranit bez změny stabilní historie projektu.

Pokud se hlavní větev během práce posune, pracovní větev se před integrací zaktualizuje pomocí běžných mechanismů Gitu, například rebase nebo merge.
]
  ],
  summary: terms => [
Samostatná pracovní větev izoluje mezistavy a chyby agentního běhu od stabilní hlavní linie a umožňuje celý neúspěšný pokus bezpečně zahodit.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)