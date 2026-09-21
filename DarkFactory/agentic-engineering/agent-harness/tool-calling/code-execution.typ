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
Spouštění kódu je nástrojová schopnost, která agentovi umožňuje vykonat program nebo příkaz a získat jeho skutečný výstup.
  ],
  description: terms => [
V současných agentních systémech se tato schopnost typicky poskytuje přes řízené shellové nebo programové prostředí. Například dokumentace Anthropic popisuje provádění Bash a Python operací v sandboxovaném kontejneru včetně práce se soubory. #cite(bib.anthropic_code_execution)

Pro vývoj softwaru umožňuje Code Execution spouštět testy, formátovače, buildy, diagnostické příkazy a další ověřovací kroky místo toho, aby model jejich výsledek pouze odhadoval.
  ],
  relations: ((type: "dependency", target: "tool_calling"), (type: "related", target: "runtime")),
)
