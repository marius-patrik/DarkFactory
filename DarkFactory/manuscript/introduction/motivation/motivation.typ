#import "/DarkFactory/templates/common.typ": define-term, translation, term, bib
#import "/DarkFactory/schema.typ": concept
#import "ai-diffusion-figure.typ" as ai_diffusion

#let terminology = define-term(
  id: "motivation-problem-definition",
  proper: translation(cs: "Motivace a vymezení problému", en: "Motivation and Problem Definition"),
  keyword: false,
)

#let item = concept(
  key: "motivation_problem_definition",
  term: terminology,
  definition: terms => [
Motivací práce je ukázat, jaké úlohy dokážou současné agentní systémy samostatně provádět a jaká technická vrstva umožňuje převést schopnost jazykového modelu do spolehlivého jednání nad skutečným softwarovým projektem.
  ],
  description: terms => [
Generativní AI se během několika let rozšířila do masového používání. Microsoft AI Economy Institute odhaduje, že v prvním čtvrtletí 2026 použilo generativní AI 17,8 % světové populace v produktivním věku. Současně se rychle rozšiřují systémy, které už pouze negenerují odpověď, ale plánují více kroků, pracují se soubory a nástroji, spouštějí příkazy a testy, kontrolují vlastní výstupy a mohou vykonávat dlouhotrvající úlohy. @microsoft2026aidiffusion

V softwarovém inženýrství tento posun reprezentují například Codex a Claude Code: jejich oficiální popisy uvádějí práci nad reálnými repozitáři, paralelní agentní úlohy, úpravy souborů, spouštění testů a další činnosti přesahující jednorázové generování kódu. @openai_codex_app @anthropic_claude_code

Práce proto nezkoumá pouze schopnost modelu vytvořit fragment programu. Zaměřuje se na #term(terms.harness) jako systémovou vrstvu, která modelu poskytuje nástroje, stav, kontext, oprávnění, kontrolní smyčku a ověřování výsledků. Právě tato vrstva rozhoduje o tom, zda lze schopnosti modelu využít jako opakovatelný agentní proces.
  ],
  summary: terms => [
Výchozí otázkou práce je, co současné agentní systémy skutečně dokážou a jak musí být navržen harness, aby jejich schopnosti bylo možné bezpečně a opakovatelně využít v reálném vývojovém prostředí.
  ],
  attachments: (ai_diffusion.item,),
  citations: (bib.microsoft2026aidiffusion, bib.openai_codex_app, bib.anthropic_claude_code),
  relations: ((type: "related", target: "harness"),)
)
