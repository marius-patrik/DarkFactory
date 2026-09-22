#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let lost_middle_pattern = example(
  key: "context_rot_lost_middle_pattern",
  title: [„Lost in the Middle“],
  source: bib.liu2024,
  description: terms => [
V experimentu s multi-document question answering i key-value retrieval vykazují testované dlouhokontextové modely výraznou citlivost na polohu relevantní informace: výkon bývá vyšší, když je informace na začátku nebo na konci vstupu, a nižší při jejím umístění uprostřed dlouhého kontextu. #cite(bib.liu2024)
  ],
)

#let item = concept(
  key: "context_rot",
  term: "Degradace kontextu",
  keyword: "Context Rot",
  citation: bib.liu2024,
  source: bib.liu2024,
  definition: terms => [
Degradace kontextu (Context Rot) označuje praktický pokles spolehlivosti, s níž model dokáže využívat relevantní informace při růstu délky, informačního zatížení nebo nevýhodném umístění informace v aktivním kontextu. #cite(bib.liu2024)
  ],
  description: terms => [
Empirické studie dlouhého kontextu ukazují, že schopnost nalézt a využít relevantní údaj není určena pouze tím, zda se údaj vejde do nominálního kontextového okna. Výkon může záviset na jeho poloze a přidání dalšího kontextu proto samo o sobě nezaručuje spolehlivější využití všech vložených informací. #cite(bib.liu2024)
  ],
  examples: (lost_middle_pattern,),
  practical: terms => [
Pouhé hromadění celé historie není spolehlivou strategií pro dlouhotrvající agentní běhy. Pozdější vrstvy agentního systému proto potřebují kontext selektivně vybírat, zkracovat nebo jinak spravovat podle aktuálního kroku.
  ],
  relations: ((type: "dependency", target: "context_window"),),
)
