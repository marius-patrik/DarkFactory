#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../../schema.typ": concept

#let terminology = define-term(id: "tool-calling", proper: translation(cs: "Vyvolávání nástrojů", en: "Tool Calling"), industry: translation(cs: "Tool Calling", en: "Tool Calling"), default-name-type: "both", explanation_cs: "Mechanismus, kterým model strukturovaně žádá harness o provedení externí akce nebo funkce s validovanými parametry.", explanation_en: "A mechanism through which a model structurally asks a harness to execute an external action or function with validated parameters.", keyword: false, citation: bib.schick2023toolformer, source: bib.anthropic2024tooluse)

#let item = concept(
  key: "tool_calling",
  term: terminology,
  heading: terms => [#finalized[Vyvolávání nástrojů \[Tool Calling\]]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#unconfirmed[
Aby mohl agent provádět reálné inženýrské operace, musí mu agent harness zpřístupnit systémové nástroje. Způsob, jakým jsou nástroje modelům předkládány, zásadně ovlivňuje ergonomii vývoje i bezpečnost celého systému.

#diff[Strukturované volání nástrojů (_Tool / Function Calling_)][Strukturované volání nástrojů (_Tool / Function Calling_ @schick2023toolformer)] používá vstupy a výstupy striktně validované vůči formálním JSON schématům. Zajišťuje vysokou typovou bezpečnost, avšak přináší režii tokenů spotřebovaných na definice schémat.
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "agent_loop"),)
)