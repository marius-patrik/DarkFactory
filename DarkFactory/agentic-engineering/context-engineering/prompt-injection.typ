#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "prompt_injection",
  keyword: "Prompt Injection",
  citation: (bib.owasp_prompt_injection, bib.owasp_llm01_prompt_injection, bib.openai_prompt_injection),
  source: bib.owasp_llm01_prompt_injection,
  definition: terms => [
Manipulace chování jazykového modelu pomocí instrukcí vložených do vstupu nebo do externího obsahu, který systém následně zpracuje jako kontext. #cite(bib.owasp_llm01_prompt_injection)
  ],
  description: terms => [
Přímá prompt injection přichází v uživatelském vstupu; nepřímá injection je vložena do externích dat, například webové stránky, e-mailu, dokumentu, repozitáře nebo zdroje RAG. #cite(bib.owasp_prompt_injection) Typickým příkladem je životopis obsahující skrytou instrukci, která se pokusí ovlivnit následné hodnocení kandidáta modelem, přestože dokument měl sloužit pouze jako data. #cite(bib.owasp_llm01_prompt_injection) Důsledky proto závisejí také na oprávněních a nástrojích, které má agent k dispozici. #cite(bib.openai_prompt_injection)
  ],
  practical: terms => [
Prompt Injection vyžaduje oddělovat důvěryhodné instrukce od nedůvěryhodného obsahu a omezovat následné nástrojové akce, protože text z prostředí může ovlivnit rozhodování modelu.
  ],
  relations: (
    (type: "dependency", target: "context_engineering"),
    (type: "related", target: "context_injection"),
    (type: "related", target: "rag"),
    (type: "related", target: "guardrail"),
    (type: "related", target: "sandbox"),
  ),
)
