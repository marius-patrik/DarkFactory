#import "/DarkFactory/templates/common.typ": translation, term, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "system_prompt",
    czech: "Systémový prompt",
  english: "System Prompt",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
definition: terms => [
Systémový prompt je instrukční vrstva s vysokou prioritou, která vymezuje roli, chování, dostupné prostředky a provozní očekávání jazykového modelu nebo agenta.
  ],
  description: terms => [
V agentním harnessu tvoří systémový prompt stabilní základ instrukčního kontextu. Může definovat roli agenta, pracovní postup, způsob používání nástrojů a pravidla komunikace, ale nemůže nahrazovat oprávnění, validaci nástrojů ani jiné deterministické mechanismy.
  ],
  summary: terms => [
Systémový prompt je hlavní instrukční rozhraní harnessu k modelu; určuje očekávané chování, nikoli technicky vynucenou bezpečnostní hranici.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "prompt_engineering"),),
)