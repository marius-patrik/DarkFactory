#import "/DarkFactory/templates/common.typ": term
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "methodology",
  czech: "Metodika práce",
  english: "Methodology",
  definition: terms => [
Práce porovnává veřejně popsané principy současných agentních systémů, rozděluje je do samostatných konceptů a používá je při návrhu DarkFactory.
  ],
  description: terms => [
Předmětem práce není trénování neuronových sítí, optimalizace vah ani podrobná matematika modelového učení. #term(terms.language_model) je chápán jako hotová inferenční komponenta a je popsán pouze v rozsahu potřebném pro další části práce.

Architektura kolem modelu je rozložena do samostatných konceptů, aby měl každý mechanismus vlastní definici, popis a shrnutí a nebylo nutné stejné vysvětlení opakovat v několika kapitolách.

Navržené principy jsou následně promítnuty do DarkFactory. Vlastnosti systému se mají posuzovat podle ověřitelných výstupů vývojového procesu, nikoli podle předem předpokládaných výsledků.
  ],
  summary: terms => [
Metodika postupuje od veřejných zdrojů a vymezení konceptů přes návrh konkrétní architektury až k ověření jejích vlastností na skutečných výstupech systému.
  ],
  relations: (
    (type: "dependency", target: "thesis_objectives_research_questions"),
    (type: "related", target: "language_model"),
    (type: "related", target: "agentic_engineering"),
    (type: "related", target: "harness"),
  ),
)
