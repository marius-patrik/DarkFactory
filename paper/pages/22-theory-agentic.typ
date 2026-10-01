#import "../components/terms.typ": term, term-name

#heading(level: 2)[Agentické inženýrství]

#term("Agentic Engineering", cs: "agentické inženýrství", definition: "Návrh a řízení softwarového vývoje tak, aby agenti pracovali uvnitř explicitně navrženého systému pravidel, kontextu, nástrojů, kontrol a lidských rozhodnutí.") přesouvá pozornost od samotného modelu k celému systému, ve kterém agent pracuje @alenezi2026agentic.

Mezi jeho hlavní oblasti patří #term("Prompt Engineering", cs: "inženýrství promptů", definition: "Formulace instrukcí, omezení, příkladů a očekávaného výstupu konkrétního modelového kroku.") @openai-prompt-engineering, #term("Context Engineering", cs: "kontextové inženýrství", definition: "Výběr, uspořádání, obnova a kompakce informací dostupných modelu v daném kroku.") @anthropic-context-engineering, #term("Harness Engineering", cs: "inženýrství harnessu", definition: "Návrh okolní vrstvy, která modelu poskytuje nástroje, stav, oprávnění a pravidla běhu.") @anthropic-harness-design @openai-agents-sandbox, #term("Loop Engineering", cs: "inženýrství smyček", definition: "Návrh řídicích smyček, které opakovaně porovnávají stav s cílem a rozhodují o dalším kroku.") @openai-goals a #term("Workflow/Graph Engineering", cs: "inženýrství pracovních postupů a grafů", definition: "Disciplína zaměřená na návrh pořadí, závislostí a větvení mezi více kroky nebo agenty.") @openai-agent-orchestration.

#heading(level: 3)[Specifikace]

#term("Spec-first Development", cs: "vývoj od specifikace", definition: "Postup, v němž je požadovaný výsledek a jeho omezení popsán před samotnou implementací.") navazuje na starší #term("Requirements Engineering", cs: "inženýrství požadavků", definition: "Systematická práce se zjišťováním, popisem a správou požadavků na software."). IEEE vydalo standard pro Software Requirements Specification už v roce 1984 @ieee830-1984 a současný ISO/IEC/IEEE 29148 formalizuje práci s požadavky v průběhu životního cyklu @iso29148-2018.

U agentů může specifikace přímo vymezit cíl a hranice implementace, zatímco konkrétní technický postup zvolí agent. Oddělení návrhu plánu od jeho provedení ukazuje @fig-claude-code-plan.

#figure(
  image("/components/img/claude-code-plan.png", width: 100%),
  caption: [Plán před implementací v Claude Code @gallardo2025beyond.],
) <fig-claude-code-plan>

#heading(level: 3)[Orchestrace]

#term("Orchestration", cs: "orchestrace", definition: "Řízení pořadí, závislostí, sdíleného stavu a integračních kontrol mezi více kroky nebo agenty.") se stává důležitou tam, kde úloha přesahuje jeden agentní běh. Více agentů samo o sobě nezaručuje lepší výsledek. Přínos vzniká až tehdy, když jsou jejich úlohy vhodně rozdělené a výstupy znovu spojeny vůči společnému cíli.

- #term("Coordinator/Subagent", cs: "koordinátor a subagent", definition: "Vzor, v němž koordinátor deleguje dílčí úlohy samostatným agentům s vlastním kontextem.") umožňuje paralelizovat nezávislé části práce @fig-antigravity-subagents

#figure(
  image("/components/img/antigravity-cli-subagents.jpg", width: 100%),
  caption: [Paralelní subagenti v Google Antigravity @antigravity-cli.],
) <fig-antigravity-subagents>

- #term("Workflow Graph", cs: "graf pracovního postupu", definition: "Graf, který předem určuje závislosti, pořadí a větvení kroků.") lze vykonávat programově mimo kontext modelu. Claude Code může u dynamických pracovních postupů vytvořit skript, který takový graf realizuje @anthropic-dynamic-workflows @fig-dynamic-workflows

#figure(
  image("/components/img/claude-code-dynamic-workflows.png", width: 100%),
  caption: [Dynamický pracovní postup v Claude Code @anthropic-dynamic-workflows.],
) <fig-dynamic-workflows>

- #term("Goal Loop", cs: "cílová smyčka", definition: "Nadřazená smyčka, která po dílčím běhu porovná stav s cílem a rozhodne, zda práce skončí nebo pokračuje.") se v jednoduché podobě objevuje ve vzoru #term("Ralph Loop", cs: "Ralphova smyčka", definition: "Jednoduchý vzor opakovaného spouštění coding agenta, který drží stav v pracovním stromu místo v přepisu konverzace.") popsaném Geoffreyem Huntleym @huntley2025ralph. Podobné cílové smyčky dnes podporují Claude Code i Codex @claude-goal @openai-goals @fig-codex-goal

#figure(
  image("/components/img/codex-goal-complete.png", width: 100%),
  caption: [Cílová smyčka v Codexu @openai-goals.],
) <fig-codex-goal>

- #term("Human-in-the-loop", cs: "člověk v rozhodovací smyčce", definition: "Zapojení explicitního lidského rozhodnutí do jinak automatizovaného procesu.") se může projevit jako schválení specifikace, plánu nebo výsledné změny
