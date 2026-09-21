#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "motivation_problem_definition",
  title: [Motivace a vymezení problému],
  definition: terms => [
Současné agentní systémy dokážou nad softwarovým projektem provádět více kroků, pracovat se soubory a nástroji a ověřovat vlastní změny. Hlavním problémem této práce proto není samotné generování kódu, ale technická vrstva, která převádí schopnosti jazykového modelu do řízeného, obnovitelného a ověřitelného vývojového procesu.
  ],
  description: terms => [
V softwarovém inženýrství tento posun reprezentují například Codex a Claude Code, které pracují nad repozitáři, upravují soubory a používají nástroje pro build nebo testování. #cite(bib.openai_codex_app) #cite(bib.anthropic_claude_code)

Rozšíření generativní AI zároveň vytváří praktický důvod tyto systémy studovat: Microsoft AI Economy Institute pro první čtvrtletí roku 2026 odhadl používání generativní AI na 17,8 % světové populace ve věku 15–64 let. #cite(bib.microsoft_ai_diffusion_2026) Tento údaj v práci slouží pouze jako kontext rozšíření technologie, nikoli jako metrika kvality nebo autonomie agentních systémů.

DarkFactory slouží jako konkrétní artefakt, na kterém práce zkoumá oddělení modelu, trvalého stavu, prostředí, nástrojů a kontrolních mechanismů.
  ],
)
