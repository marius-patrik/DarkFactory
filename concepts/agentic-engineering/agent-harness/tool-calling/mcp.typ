#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "mcp",
    proper: translation(cs: "Model Context Protocol", en: "Model Context Protocol"),
    industry: translation(cs: "MCP", en: "MCP"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Model Context Protocol — otevřený standard původně navržený společností Anthropic pro standardizovanou komunikaci AI aplikací s externími nástroji, zdroji a daty prostřednictvím zpráv JSON-RPC.",
    explanation_en: "Model Context Protocol — an open standard originally introduced by Anthropic for standardized communication between AI applications and external tools, resources, and data through JSON-RPC messages.",
  )

#let item = concept(
  key: "mcp",
  term: terminology,
  heading: terms => [#finalized[#term(terms.mcp, marker: false, linked: false, emphasized: false) servery]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#accepted[Pro sjednocení rozhraní mezi AI aplikacemi a externími nástroji či datovými zdroji vznikl otevřený standard #term(terms.mcp, render: "both", detail-language: "cs", detail-style: "inline") @anthropic-mcp. Namísto vytváření proprietárních rozhraní pro každou službu definuje MCP standardizovaný způsob komunikace.]

Základní vlastnosti protokolu MCP:
- Protokolové rozhraní: Komunikace probíhá prostřednictvím standardu JSON-RPC (přes standardní vstup/výstup `stdio` nebo proud událostí `Server-Sent Events / SSE`).
- Architektonické oddělení: Implementace nástrojů běží jako samostatný proces mimo jádro harnessu. MCP servery fungují jako znovupoužitelné komponenty, které lze snadno sdílet napříč různými agenty a projekty.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "tool_calling"),)
)
