#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "merge",
    industry: "Merge",
  czech: "Sloučení větví",
  english: "Branch Merge",
  citation: bib.chacon2014,
  source: bib.chacon2014,
definition: terms => [
Merge je operace správy verzí, která kombinuje změny nebo historii dvou vývojových linií do společného výsledného stavu; případné konflikty vyžadují explicitní vyřešení.
  ],
  description: terms => [
#finalized[
Agent může během jednoho úkolu vytvářet více pracovních commitů při iterativním vývoji a opravách. V navrženém procesu DarkFactory se tato pracovní historie před začleněním do hlavní větve zjednoduší pomocí #term(terms.squash, language: "en", marker: false, linked: false, emphasized: false) @chacon2014.

Výsledkem je jeden integrační commit odpovídající jednomu dokončenému úkolu. Pomocné mezikroky zůstávají v pracovní větvi, zatímco hlavní historie zachovává výslednou změnu jako jeden celek, který lze samostatně auditovat nebo případně vrátit.
]
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "branch"),),
)