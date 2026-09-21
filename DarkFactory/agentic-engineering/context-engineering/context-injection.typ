#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_injection",
  industry: "Context Injection",
  czech: "Vkládání kontextu",
  citation: bib.anthropic_context_engineering,
  source: bib.anthropic_context_engineering,
  definition: terms => [
V této práci označuje Context Injection cílené vložení relevantních informací do aktivního kontextu až v okamžiku, kdy jsou potřebné pro aktuální krok. #cite(bib.anthropic_context_engineering)
  ],
  description: terms => [
Just-in-time přístup umožňuje mimo modelový kontext uchovávat odkazy nebo trvalý stav a potřebná data načíst nástrojem až během běhu. #cite(bib.anthropic_context_engineering)
  ],
  relations: ((type: "dependency", target: "context_engineering"), (type: "related", target: "state")),
)
