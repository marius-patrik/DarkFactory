#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "context_injection",
  industry: "Context Injection",
  czech: "Vkládání kontextu",
  definition: terms => [
Context Injection je cílené vložení informací do aktivního kontextu modelu v okamžiku, kdy jsou potřebné pro aktuální krok úlohy.
  ],
  description: terms => [
Harness může tímto způsobem doplnit instrukce, stav projektu, výsledky nástrojů nebo externě načtená data bez jejich trvalého držení v celém průběhu sezení.
  ],
  relations: ((type: "dependency", target: "context_engineering"),),
)
