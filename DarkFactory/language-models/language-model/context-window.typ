#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let lost_middle_example = example(
  key: "context_window_lost_middle",
  title: [Long-context model s nominálním 16K oknem],
  source: bib.liu2024,
  description: terms => [
Liu et al. mezi testovanými systémy zahrnují LongChat-13B s kontextovým oknem 16K a ukazují, že samotná deklarovaná kapacita neznamená stejně spolehlivé využití informace ve všech pozicích dlouhého vstupu. #cite(bib.liu2024)
  ],
)

#let item = concept(
  key: "context_window",
  term: "Kontextové okno",
  keyword: "Context Window",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Kontextové okno je konečný rozsah tokenové sekvence, kterou model může mít v daném inferenčním běhu současně k dispozici jako aktivní vstup. #cite(bib.liu2024)
  ],
  description: terms => [
O tuto kapacitu se dělí instrukce, historie konverzace, uživatelská data, výsledky nástrojů a další vložený obsah. Nominální maximální délka však popisuje kapacitu vstupu, nikoli záruku, že model využije každou relevantní informaci v dlouhém kontextu stejně spolehlivě. #cite(bib.liu2024)
  ],
  examples: (lost_middle_example,),
  practical: terms => [
Agent nemůže do jednoho inferenčního kroku bez omezení hromadit instrukce, přepis, nástrojové výstupy a další kontext. Musí proto hlídat aktivní tokenový rozpočet a rozhodovat, které informace mají být v konkrétním kroku dostupné.
  ],
  relations: ((type: "dependency", target: "token"),),
)
