#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_window",
  term: "Kontextové okno",
  keyword: "Context Window",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Maximální rozsah tokenové sekvence dostupný modelu v jednom inferenčním běhu. #cite(bib.liu2024)
  ],
  description: terms => [
Do aktivního kontextu mohou vstupovat instrukce, uživatelský vstup i další data předaná systému pro daný inferenční běh. Samotná nominální délka okna nezaručuje, že model všechny vložené informace využije stejně spolehlivě. #cite(bib.liu2024)
  ],
  practical: terms => [
Kontextové okno omezuje množství instrukcí, historie a pozorování dostupných modelu v jednom kroku, takže agent musí kontext vybírat a průběžně spravovat.
  ],
  relations: ((type: "dependency", target: "token"),),
)
