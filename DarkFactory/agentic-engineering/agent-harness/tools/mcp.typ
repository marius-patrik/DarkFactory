#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "mcp",
  keyword: "MCP",
  citation: (bib.anthropic_mcp, bib.claude_code_mcp),
  source: bib.anthropic_mcp,
  definition: terms => [
Otevřený protokol pro standardizované propojení AI aplikací s externími nástroji a datovými zdroji. #cite(bib.anthropic_mcp)
  ],
  description: terms => [
MCP odděluje klientskou AI aplikaci od serverů poskytujících nástroje a další schopnosti, takže integrace lze implementovat mimo vlastní jádro harnessu. #cite(bib.anthropic_mcp) #cite(bib.claude_code_mcp)
  ],
  practical: terms => [
MCP standardizuje připojení externích nástrojů, zdrojů a promptů k agentnímu hostiteli, takže integrace nemusí být navržena zvlášť pro každý modelový klient.
  ],
  relations: ((type: "dependency", target: "harness"), (type: "related", target: "tools")),
)
