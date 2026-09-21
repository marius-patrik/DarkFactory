#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "software_engineering",
    czech: "Softwarové inženýrství",
  english: "Software Engineering",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
definition: terms => [
Softwarové inženýrství je systematické uplatňování inženýrských principů na specifikaci, návrh, implementaci, ověřování, provoz a údržbu softwarových systémů.
  ],
  description: terms => [
Pro agentní systémy je tento rámec důležitý proto, že generování kódu představuje pouze jednu část životního cyklu změny. Výsledek musí být zasazen do specifikace požadavku, řízeného procesu změn, automatického ověřování a následné revize.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)
