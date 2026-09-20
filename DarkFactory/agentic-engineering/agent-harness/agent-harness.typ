#import "/DarkFactory/templates/common.typ": define-term, translation, term, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/codex.typ" as codex
#import "examples/claude-code.typ" as claude_code
#import "examples/claude-desktop.typ" as claude_desktop

#let terminology = define-term(
  id: "harness",
  proper: translation(cs: "Agentní harness", en: "Agent Harness"),
  industry: translation(cs: "Agent Harness", en: "Agent Harness"),
  explanation_cs: "Aplikační a orchestrační vrstva kolem modelu, která zajišťuje nástroje, kontext, stav, oprávnění a řízení prováděcího cyklu.",
  explanation_en: "An application and orchestration layer around a model that provides tools, context, state, permissions, and execution-loop control.",
  citation: bib.deepseekharness2026,
  source: bib.darkfactory,
)

#let item = concept(
  key: "harness",
  term: terminology,
  definition: terms => [
Agentní harness je aplikační a orchestrační vrstva, která propojuje model s prostředím a řídí jeho opakované jednání nad stavem a nástroji.
  ],
  description: terms => [
Harness sestavuje kontext, zpřístupňuje a omezuje nástroje, spravuje stav sezení, vyhodnocuje výsledky akcí a rozhoduje o pokračování nebo ukončení prováděcí smyčky. Tím odděluje pravděpodobnostní rozhodování modelu od deterministických pravidel systému. Ústředním prováděcím mechanismem je #term(terms.agent_loop).
  ],
  summary: terms => [
Schopnosti agentního systému proto nelze připsat pouze modelu: vznikají souhrou modelu a harnessu, který mu poskytuje prostředí pro řízené jednání.
  ],
  examples: (codex.item, claude_code.item, claude_desktop.item),
  relations: ((type: "dependency", target: "agent"), (type: "dependency", target: "language_model")),
)
