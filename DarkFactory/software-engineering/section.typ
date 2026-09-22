#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "agentic_engineering",
  title: [AI-asistovaný vývoj a agentické inženýrství],
  term: "Agentické inženýrství",
  citation: bib.anthropic_context_engineering,
  source: bib.anthropic_context_engineering,
  definition: terms => [
AI ve vývoji softwaru posouvá část práce od přímého psaní k zadávání, delegování a kontrole změn. Agentické inženýrství označuje návrh způsobu, jakým se schopnosti Harnessu skládají, omezují a koordinují tak, aby agent cíleně plnil delší úlohu. #cite(bib.anthropic_context_engineering)
  ],
  description: terms => [
Kapitola spojuje způsob formulace práce, řízení změny a nezávislé ověření kvality s návrhem instrukcí, kontextu, řízení chování a orchestrace agentů.
  ],
  practical: terms => [
Agentické inženýrství převádí obecné schopnosti modelu a Harnessu do opakovatelného vývojového procesu s explicitním zadáním, kontrolami, řízeným kontextem a koordinací práce.
  ],
  relations: ((type: "dependency", target: "harness"),),
  conclusion: terms => [
Delegování práce AI nezmenšuje potřebu softwarově-inženýrských kontrol; přesouvá jejich význam k explicitnímu zadání, sledovatelným změnám, řízenému kontextu a strojově ověřitelné zpětné vazbě. Tyto principy vytvářejí základ pro konkrétní realizaci v systému DarkFactory.
  ],
)
