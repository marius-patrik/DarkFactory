#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "code_execution",
  industry: "Code Execution",
  czech: "Spouštění kódu",
  english: "Code Execution",
  citation: bib.anthropic_code_execution,
  source: bib.anthropic_code_execution,
  definition: terms => [
Nástrojová schopnost, která umožňuje vykonat program nebo příkaz a získat jeho skutečný výstup.
  ],
  description: terms => [
Při vývoji softwaru umožňuje spouštět testy, buildy, formátovače a diagnostické příkazy v řízeném prostředí místo odhadování jejich výsledku modelem. #cite(bib.anthropic_code_execution)
  ],
  relations: ((type: "dependency", target: "tools"), (type: "related", target: "runtime")),
)
