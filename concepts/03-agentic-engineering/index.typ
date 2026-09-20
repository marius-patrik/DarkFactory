#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": section
#import "prompt-engineering.typ" as prompt_engineering
#import "system-prompt.typ" as system_prompt
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

#let terminology = define-term(id: "agentic-systems", proper: translation(cs: "Agentické systémy", en: "Agentic Systems"), explanation_cs: "Systémy, v nichž jazykový model prostřednictvím okolní softwarové infrastruktury plánuje, používá nástroje a vykonává vícefázové úlohy.", explanation_en: "Systems in which a language model plans, uses tools, and executes multi-step tasks through surrounding software infrastructure.", keyword: false)

#let item = section(
  key: "agentic_systems",
  term: terminology,
  heading: terms => [#finalized[Agentic Systems (Agentické systémy)]],
  theory_prelude: none,
  theory_intro_heading: none,
  theory_intro: none,
  theory_summary: none,
  practical_prelude: none,
  practical_intro_heading: none,
  practical_intro: none,
  practical_summary: none,
  practical_grouped: false,
  concepts: (
    agentic_engineering.item,
    harness.item,
    prompt_engineering.item,
    system_prompt.item,
    agent_loop.item,
    tool_calling.item,
    sandbox.item,
    divergence.item,
    skills.item,
    mcp.item,
    graph_engineering.item,
    human_in_the_loop.item,
    plugins.item,
    script.item,
    hook.item,
    context_engineering.item,
    loop_engineering.item,
    dag.item,
  ),
)
