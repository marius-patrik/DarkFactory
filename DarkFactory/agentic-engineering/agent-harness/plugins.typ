#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "plugins",
  term: "Pluginy",
  keyword: "Plugins",
  citation: bib.claude_code_plugins,
  source: bib.claude_code_plugins,
  definition: terms => [
V této práci označují Plugins distribuovatelný mechanismus pro doplnění schopností a běhového chování agentního prostředí. #cite(bib.claude_code_plugins)
  ],
  description: terms => [
Konkrétní platformy mohou do jednoho plugin balíčku zahrnout různé druhy rozšíření, například skills, agenty, hooks nebo konfiguraci MCP serverů. #cite(bib.claude_code_plugins) Taxonomie této práce ale odděluje koncept Skills od Plugins a pod Plugins řadí Tools, Scripts, Hooks a MCP.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
