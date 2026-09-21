#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "prompt_injection",
  industry: "Prompt Injection",
  czech: "Prompt injection",
  english: "Prompt Injection",
  citation: (bib.owasp_prompt_injection, bib.openai_prompt_injection),
  source: bib.owasp_prompt_injection,
  definition: terms => [
Manipulace chování jazykového modelu pomocí instrukcí vložených do vstupu nebo do externího obsahu, který systém následně zpracuje jako kontext.
  ],
  description: terms => [
Přímá prompt injection pochází přímo z uživatelského vstupu; nepřímá injection může být skryta například ve webové stránce, e-mailu, dokumentu, repozitáři nebo zdroji RAG. Takový obsah může ovlivnit rozhodování agenta, přestože měl sloužit pouze jako data. #cite(bib.owasp_prompt_injection) #cite(bib.openai_prompt_injection)
  ],
  relations: (
    (type: "dependency", target: "context_engineering"),
    (type: "related", target: "context_injection"),
    (type: "related", target: "rag"),
    (type: "related", target: "guardrail"),
    (type: "related", target: "sandbox"),
  ),
)
