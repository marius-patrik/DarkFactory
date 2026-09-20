#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "divergence",
    czech: "Patologie divergence",
  english: "Agent Divergence Pathologies",
  citation: bib.shinn2023reflexion,
  source: bib.shinn2023reflexion,
definition: terms => [
Divergence je třída selhání agentní smyčky, při níž se iterativní běh vzdaluje cíli například perseverací, oscilací nebo nekontrolovanou spotřebou zdrojů.
  ],
  description: terms => [
Ponechání jazykového modelu v neomezené prováděcí smyčce vede k předvídatelným selháním @shinn2023reflexion. V důsledku autoregresivní povahy se v kontextu snadno vytvoří pravděpodobnostní atraktor, který model uvězní v neproduktivním cyklu.

Mezi typické patologie patří:
- Perseverace a zacyklení: Opakované volání identického nástroje se stejnými neplatnými argumenty (např. čtení neexistujícího souboru) i po obdržení chybové zprávy.
- Oscilace a těkání (_Thrashing_): Střídavé přepínání mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije modul A).
- Nekontrolovaná spotřeba zdrojů (_Context Runaway_): Rychlé vyčerpání kontextového okna i finančního rozpočtu na volání API bez dosažení cíle.
  ],
  summary: terms => [
Divergenci nelze řešit pouze lepším promptem; harness musí rozpoznávat neproduktivní trajektorie a omezovat jejich pokračování.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)