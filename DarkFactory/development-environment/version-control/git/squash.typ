#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "squash",
    industry: "Squash",
  czech: "Sloučení commitů",
  english: "Commit Squashing",
  citation: bib.chacon2014,
  source: bib.chacon2014,
definition: terms => [
Squash je operace, při níž se více po sobě jdoucích commitů nahradí jedním souhrnným commitem, obvykle za účelem zjednodušení historie před integrací změn.
  ],
  description: terms => [
V agentním běhu často vzniká více pomocných commitů během iterativního ladění. Před začleněním výsledné změny lze tyto mezikroky sloučit do jednoho logického záznamu odpovídajícího dokončenému úkolu.
  ],
  summary: terms => [
Squash odděluje experimentální průběh práce od dlouhodobé historie projektu a umožňuje uchovat jednu logickou změnu jako jeden auditovatelný commit.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "merge"),),
)