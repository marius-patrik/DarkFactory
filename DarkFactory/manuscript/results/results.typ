#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "results_discussion",
  title: [Výsledky a diskuse],
  definition: terms => [
Tato část odděluje doložené vlastnosti implementace DarkFactory od tvrzení, která vyžadují další end-to-end nebo fleet-level důkaz.
  ],
  description: terms => [
Výsledky vycházejí z konkrétního referenčního commitu, automatických testů, CI check runů a zdrojového kódu. Architektonická existence mechanismu není zaměňována za důkaz jeho úspěšného použití v celém produkčním životním cyklu.
  ],
)
