#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "system_prompt",
  czech: "Systémový prompt",
  english: "System Prompt",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
  definition: terms => [
Instrukční vrstva s vysokou prioritou, která vymezuje roli a základní pravidla chování modelu nebo agenta.
  ],
  description: terms => [
V harnessu tvoří stabilní instrukční základ pro práci s kontextem a nástroji, nikoli technickou bezpečnostní hranici.
  ],
  relations: ((type: "dependency", target: "prompt_engineering"),),
)
