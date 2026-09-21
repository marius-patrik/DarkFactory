#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "mcp",
  industry: "MCP",
  czech: "Model Context Protocol",
  english: "Model Context Protocol",
  citation: bib.anthropic_mcp,
  source: bib.anthropic_mcp,
  definition: terms => [
Otevřený protokol pro standardizované propojení AI aplikací s externími nástroji, zdroji a daty.
  ],
  description: terms => [
MCP používá klient–server rozhraní nad JSON-RPC, takže nástroje a datové zdroje mohou být implementovány mimo jádro harnessu a znovu používány různými aplikacemi. #cite(bib.anthropic_mcp)
  ],
  relations: ((type: "dependency", target: "tools"), (type: "related", target: "plugins")),
)
