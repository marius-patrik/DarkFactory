#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(id: "agent-divergence", proper: translation(cs: "Patologie divergence", en: "Agent Divergence Pathologies"), explanation_cs: "Třída selhání agentní smyčky, při níž se iterativní běh vzdaluje cíli například perseverací, oscilací nebo nekontrolovanou spotřebou zdrojů.", explanation_en: "A class of agent-loop failures in which iterative execution moves away from the goal through perseveration, oscillation, or uncontrolled resource consumption.", keyword: false, citation: bib.shinn2023reflexion, source: bib.shinn2023reflexion)

#let item = concept(
  key: "divergence",
  term: terminology,
  heading: terms => [Patologie divergence: perseverace a oscilace],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#diff[Ponechání jazykového modelu v neomezené prováděcí smyčce vede k předvídatelným selháním.][Ponechání jazykového modelu v neomezené prováděcí smyčce vede k předvídatelným selháním @shinn2023reflexion.] V důsledku autoregresivní povahy se v kontextu snadno vytvoří pravděpodobnostní atraktor, který model uvězní v neproduktivním cyklu.

Mezi typické patologie patří:
- Perseverace a zacyklení: Opakované volání identického nástroje se stejnými neplatnými argumenty (např. čtení neexistujícího souboru) i po obdržení chybové zprávy.
- Oscilace a těkání (_Thrashing_): Střídavé přepínání mezi dvěma protichůdnými zásahy (úprava modulu A rozbije modul B a následná oprava B rozbije modul A).
- Nekontrolovaná spotřeba zdrojů (_Context Runaway_): Rychlé vyčerpání kontextového okna i finančního rozpočtu na volání API bez dosažení cíle.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ()
)