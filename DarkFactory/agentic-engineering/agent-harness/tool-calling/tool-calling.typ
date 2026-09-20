#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "tool_calling",
    industry: "Tool Calling",
  czech: "Vyvolávání nástrojů",
  english: "Tool Calling",
  citation: bib.schick2023toolformer,
  source: bib.anthropic2024tooluse,
definition: terms => [
Vyvolávání nástrojů je mechanismus, kterým model strukturovaně žádá harness o provedení externí akce nebo funkce s validovanými parametry.
  ],
  description: terms => [
#unconfirmed[
Aby mohl agent provádět reálné inženýrské operace, musí mu agent harness zpřístupnit systémové nástroje. Způsob, jakým jsou nástroje modelům předkládány, zásadně ovlivňuje ergonomii vývoje i bezpečnost celého systému.

#diff[Strukturované volání nástrojů (_Tool / Function Calling_)][Strukturované volání nástrojů (_Tool / Function Calling_ @schick2023toolformer)] používá vstupy a výstupy striktně validované vůči formálním JSON schématům. Zajišťuje vysokou typovou bezpečnost, avšak přináší režii tokenů spotřebovaných na definice schémat.
]
  ],
  summary: terms => [
Tool calling tvoří typované rozhraní mezi pravděpodobnostním rozhodnutím modelu a deterministickým vykonáním akce; formální schémata zvyšují validovatelnost za cenu kontextové režie.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "agent_loop"),),
)