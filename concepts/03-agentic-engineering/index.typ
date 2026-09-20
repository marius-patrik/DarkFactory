#import "../../templates/common.typ": define-term, translation
#import "../schema.typ": section
#import "prompt-engineering.typ" as prompt_engineering
#import "agent-loop.typ" as agent_loop
#import "tool-calling.typ" as tool_calling
#import "sandbox.typ" as sandbox
#import "divergence.typ" as divergence
#import "skills.typ" as skills
#import "mcp.typ" as mcp
#import "graph-engineering.typ" as graph_engineering
#import "human-in-the-loop.typ" as human_in_the_loop
#import "agentic-engineering.typ" as agentic_engineering
#import "harness.typ" as harness
#import "plugins.typ" as plugins
#import "script.typ" as script
#import "hook.typ" as hook
#import "context-engineering.typ" as context_engineering
#import "loop-engineering.typ" as loop_engineering
#import "dag.typ" as dag

#let terminology = define-term(id: "agentic-harness-engineering", proper: translation(cs: "Agentické a harnessové inženýrství", en: "Agentic and Harness Engineering"), explanation_cs: "Návrh, orchestrace a provoz agentních systémů kolem jazykových modelů včetně jejich smyček, nástrojů, kontextu, grafů a lidského dohledu.", explanation_en: "The design, orchestration, and operation of agentic systems around language models, including their loops, tools, context, graphs, and human oversight.", keyword: false)

#let item = section(
  key: "agentic_harness_engineering",
  term: terminology,
  heading: terms => [#accepted[#term(terms.agentic_engineering, name-separator: "paren", name-order: "cs-en", marker: false, linked: false, emphasized: false) a #term(terms.harness, language: "en", marker: false, linked: false, emphasized: false)]],
  theory_prelude: none,
  theory_intro_heading: terms => [#finalized[Úvod]],
  theory_intro: terms => [
#accepted[
V terminologii agentického inženýrství používá tato práce pojem #term(terms.harness). #term(terms.harness, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false). Samotné inferenční jádro provádí výhradně matematické maticové operace nad zadanými váhami a vektory tokenů; veškerou orchestraci, práci se soubory a řízení bezpečnosti zajišťuje harness.

Ústřední komponentou a hlavní prováděcí funkcí, která v architektuře harnessu řídí samotný běh a iterativní koordinaci agenta v reálném vývojovém prostředí, je #term(terms.agent_loop). #term(terms.agent_loop, render: "explanation", detail-language: "cs", detail-style: "inline", register: false, linked: false, marker: false, emphasized: false).
]
  ],
  theory_summary: none,
  practical_prelude: none,
  practical_intro_heading: none,
  practical_intro: none,
  practical_summary: none,
  practical_grouped: false,
  concepts: (
    prompt_engineering.item,
    agent_loop.item,
    tool_calling.item,
    sandbox.item,
    divergence.item,
    skills.item,
    mcp.item,
    graph_engineering.item,
    human_in_the_loop.item,
    agentic_engineering.item,
    harness.item,
    plugins.item,
    script.item,
    hook.item,
    context_engineering.item,
    loop_engineering.item,
    dag.item,
  ),
)
