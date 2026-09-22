#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "code_execution",
  term: "Spouštění kódu",
  keyword: "Code Execution",
  citation: bib.anthropic_code_execution,
  source: bib.anthropic_code_execution,
  definition: terms => [
Nástrojová schopnost umožňující vykonat program nebo příkaz a vrátit jeho skutečný výstup modelu. #cite(bib.anthropic_code_execution)
  ],
  description: terms => [
Při vývoji softwaru zpřístupňuje agentovi například testy, buildy, formátovače a diagnostické příkazy místo odhadování jejich výsledku. #cite(bib.anthropic_code_execution)
  ],
  practical: terms => [
Spouštění kódu umožňuje agentovi ověřovat hypotézy příkazy, testy a programy namísto pouhého predikování jejich výsledku.
  ],
  relations: ((type: "parent", target: "tools"), (type: "related", target: "sandbox")),
)
