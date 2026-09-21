#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "prompt_engineering",
    czech: "Promptové inženýrství",
  english: "Prompt Engineering",
  citation: bib.anthropic_prompt,
  source: bib.anthropic_prompt,
definition: terms => [
Promptové inženýrství je systematický návrh a strukturování instrukcí, které vymezují požadované chování, kontext a provozní očekávání jazykového modelu nebo agenta.
  ],
  description: terms => [
V agentním systému prompt určuje roli modelu, způsob práce s dostupným kontextem a očekávaný postup při používání nástrojů. Instrukce však nejsou technicky vynucovanou bezpečnostní hranicí: podmínky, jejichž porušení by mohlo poškodit stav systému nebo obejít procesní pravidla, musí zajišťovat deterministický #term(terms.guardrail). Základní dlouhodobé instrukce jsou soustředěny v #term(terms.system_prompt).
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)