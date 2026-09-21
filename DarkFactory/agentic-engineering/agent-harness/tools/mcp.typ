#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "mcp",
  industry: "MCP",
  czech: "Model Context Protocol",
  english: "Model Context Protocol",
  citation: (bib.anthropic_mcp, bib.claude_code_mcp),
  source: bib.anthropic_mcp,
  definition: terms => [
Otevřený protokol pro standardizované propojení AI aplikací s externími nástroji a datovými zdroji. #cite(bib.anthropic_mcp)
  ],
  description: terms => [
MCP odděluje klientskou AI aplikaci od serverů poskytujících nástroje a další schopnosti, takže integrace lze implementovat mimo vlastní jádro harnessu. #cite(bib.anthropic_mcp) #cite(bib.claude_code_mcp)
  ],
  relations: ((type: "dependency", target: "plugins"), (type: "related", target: "tools")),
)
