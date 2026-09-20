#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "mcp",
    industry: "MCP",
  czech: "Model Context Protocol",
  english: "Model Context Protocol",
  citation: bib.anthropic_mcp,
  source: bib.anthropic_mcp,
definition: terms => [
Model Context Protocol (MCP) je otevřený standard původně navržený společností Anthropic pro standardizovanou komunikaci AI aplikací s externími nástroji, zdroji a daty prostřednictvím zpráv JSON-RPC.
  ],
  description: terms => [
#finalized[Pro sjednocení rozhraní mezi AI aplikacemi a externími nástroji či datovými zdroji vznikl otevřený standard #term(terms.mcp) @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP standardizovaný způsob komunikace.]

Základní vlastnosti protokolu MCP:
- Protokolové rozhraní: Komunikace probíhá prostřednictvím standardu JSON-RPC (přes standardní vstup/výstup `stdio` nebo proud událostí `Server-Sent Events / SSE`).
- Architektonické oddělení: Implementace nástrojů běží jako samostatný proces mimo jádro harnessu. MCP servery fungují jako znovupoužitelné komponenty, které lze snadno sdílet napříč různými agenty a projekty.
  ],
  summary: terms => [
MCP odděluje implementaci integrací od jádra harnessu a umožňuje stejné nástroje a datové zdroje znovu používat napříč agentními systémy.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "plugins"),),
)