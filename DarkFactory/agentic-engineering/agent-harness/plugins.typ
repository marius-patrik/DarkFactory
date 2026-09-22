#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "plugins",
  term: "Pluginy",
  keyword: "Plugins",
  citation: bib.claude_code_plugins,
  source: bib.claude_code_plugins,
  definition: terms => [
Distribuovatelné rozšíření, které do hostitelského agentního prostředí přidává další chování nebo integrace. #cite(bib.claude_code_plugins)
  ],
  description: terms => [
Konkrétní platforma může plugin použít jako obal pro různé druhy rozšíření, například skills, hooks, agenty nebo konfiguraci externích integrací. Plugin zde proto označuje způsob balení a distribuce, nikoli nadřazenou kategorii všech mechanismů Harnessu. #cite(bib.claude_code_plugins)
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "skills"), (type: "related", target: "hooks"), (type: "related", target: "mcp")),
)
