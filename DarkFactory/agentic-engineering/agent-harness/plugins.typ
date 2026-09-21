#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "plugins",
  industry: "Plugins",
  czech: "Rozšíření",
  english: "Plugins",
  citation: bib.claude_code_plugins,
  source: bib.claude_code_plugins,
  definition: terms => [
Distribuovatelný balíček rozšíření, kterým lze doplnit schopnosti a běhové chování agentního prostředí.
  ],
  description: terms => [
Plugin může sdružovat více komponent, například skills, agenty, hooks a konfiguraci MCP serverů. #cite(bib.claude_code_plugins)
  ],
  relations: ((type: "dependency", target: "harness"),),
)
