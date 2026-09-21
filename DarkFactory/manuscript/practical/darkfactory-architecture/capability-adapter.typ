#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "capability_adapter",
  industry: "Capability Adapter",
  czech: "Adaptér capability",
  english: "Capability Adapter",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Odvozené rozhraní, které zpřístupňuje jednu kanonickou capability jinému runtime nebo integračnímu formátu.
  ],
  description: terms => [
Současná implementace umí z capability definice vytvořit nativní in-process adaptér, Pi adaptér a MCP adaptér bez duplikace samotné capability definice.
  ],
  relations: ((type: "parent", target: "darkfactory_capability"), (type: "dependency", target: "capability_abi"), (type: "related", target: "mcp")),
)
