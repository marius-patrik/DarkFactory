#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "runtime",
  industry: "Runtime",
  czech: "Běhové prostředí",
  citation: bib.oci_runtime_spec,
  source: bib.oci_runtime_spec,
  definition: terms => [
V této práci označuje Runtime prostředí a systémové prostředky dostupné programu během jeho vykonávání.
  ],
  description: terms => [
Běhové prostředí vymezuje například procesy, souborový systém, síť, oprávnění a další podmínky vykonávání. Standardizované runtime specifikace mohou tyto podmínky definovat jako přenositelný kontrakt; OCI Runtime Specification například popisuje konfiguraci, execution environment a lifecycle kontejneru. #cite(bib.oci_runtime_spec)
  ],
  relations: ((type: "related", target: "container"), (type: "related", target: "sandbox")),
)
