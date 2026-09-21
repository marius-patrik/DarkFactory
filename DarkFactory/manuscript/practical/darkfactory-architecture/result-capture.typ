#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "result_capture",
  industry: "Result Capture",
  czech: "Zachycení výsledku",
  english: "Result Capture",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Mechanismus pro převod výsledku agentního kroku a pozorovaných účinků do strukturovaného, validovatelného výsledku.
  ],
  description: terms => [
Aktuální implementace obsahuje schema-driven capture pro strukturované soudy i deterministické zachycení výsledku kódového kroku z reálně změněných souborů, ověřovacích akcí a commitů.
  ],
  relations: ((type: "dependency", target: "darkfactory_protocol"), (type: "related", target: "json_schema_tool_calling")),
)
