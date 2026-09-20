#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "mcp",
    proper: translation(cs: "Model Context Protocol", en: "Model Context Protocol"),
    industry: translation(cs: "MCP", en: "MCP"),
    explanation_cs: "Model Context Protocol — otevřený standard původně navržený společností Anthropic pro standardizovanou komunikaci AI aplikací s externími nástroji, zdroji a daty prostřednictvím zpráv JSON-RPC.",
    explanation_en: "Model Context Protocol — an open standard originally introduced by Anthropic for standardized communication between AI applications and external tools, resources, and data through JSON-RPC messages.",
    citation: bib.anthropic_mcp,
    source: bib.anthropic_mcp,
)

#let item = concept(
  key: "mcp",
  term: terminology,
  definition: none,
  description: terms => [
#accepted[Pro sjednocení rozhraní mezi AI aplikacemi a externími nástroji či datovými zdroji vznikl otevřený standard #term(terms.mcp, render: "both", detail-language: "cs", detail-style: "inline") @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP standardizovaný způsob komunikace.]

Základní vlastnosti protokolu MCP:
- Protokolové rozhraní: Komunikace probíhá prostřednictvím standardu JSON-RPC (přes standardní vstup/výstup `stdio` nebo proud událostí `Server-Sent Events / SSE`).
- Architektonické oddělení: Implementace nástrojů běží jako samostatný proces mimo jádro harnessu. MCP servery fungují jako znovupoužitelné komponenty, které lze snadno sdílet napříč různými agenty a projekty.
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "plugins"),),
)