// ─────────────────────────────────────────────────────────────
//  ODBORNÁ PRÁCE — jediný kanonický zdrojový soubor .typ
// ─────────────────────────────────────────────────────────────

// ── Kanonické bibliografické proměnné ───────────────────────
// Canonical bibliographic reference variables mirroring bib/references.bib.
// Used for structured citation and source attribution on terminology and concepts.

#let darkfactory = <darkfactory>
#let humble2010 = <humble2010>
#let chacon2014 = <chacon2014>
#let vaswani2017 = <vaswani2017>
#let anthropic_prompt = <anthropic-prompt>
#let yao2022 = <yao2022>
#let liu2024 = <liu2024>
#let ainslie2023 = <ainslie2023>
#let lewis2020rag = <lewis2020rag>
#let jiang2023llmlingua = <jiang2023llmlingua>
#let agache2020firecracker = <agache2020firecracker>
#let sennrich2016bpe = <sennrich2016bpe>
#let mikolov2013word2vec = <mikolov2013word2vec>
#let mikolov2013linguistic = <mikolov2013linguistic>
#let mikolov2013compositionality = <mikolov2013compositionality>
#let kwon2023pagedattention = <kwon2023pagedattention>
#let sommerville2016 = <sommerville2016>
#let anthropic2024tooluse = <anthropic2024tooluse>
#let karpathy2025vibecoding = <karpathy2025vibecoding>
#let willison2025vibecoding = <willison2025vibecoding>
#let cambridge2026aislop = <cambridge2026aislop>
#let agent_skills_spec = <agentskills-spec>
#let anthropic_code_execution = <anthropic2026codeexecution>
#let coderabbit2026vibehistory = <coderabbit2026vibehistory>
#let openai_agents_sessions = <openai-agents-sessions>
#let openai_agents_guardrails = <openai-agents-guardrails>
#let claude_code_plugins = <claude-code-plugins>
#let claude_code_hooks = <claude-code-hooks>
#let github_branches = <github-branches>
#let github_pull_requests = <github-pull-requests>
#let anthropic_context_engineering = <anthropic-context-engineering>
#let anthropic_harness_design = <anthropic-harness-design>
#let anthropic_managed_agents = <anthropic-managed-agents>
#let owasp_prompt_injection = <owasp-prompt-injection>
#let openai_prompt_injection = <openai-prompt-injection>
#let openai_agent_orchestration = <openai-agent-orchestration>
#let hevner2004designscience = <hevner2004designscience>
#let peffers2007dsrm = <peffers2007dsrm>
#let gradually_ai_usage_2026 = <gradually-ai-usage-2026>
#let epoch_eci_frontier_2026 = <epoch-eci-frontier-2026>
#let artificial_analysis_intelligence_v4_3_2 = <artificial-analysis-intelligence-v4-3-2>
#let brown2020 = <brown2020>
#let owasp_llm01_prompt_injection = <owasp-llm01-prompt-injection>
#let darkfactory_e9c10221 = <darkfactory-e9c10221>
#let darkfactory_ci_35616745304 = <darkfactory-ci-35616745304>
#let omnis_a53660a1 = <omnis-a53660a1>
#let omnis_ci_34708160162 = <omnis-ci-34708160162>
#let chesswithquests_50a50797 = <chesswithquests-50a50797>
#let chesswithquests_ci_34708180783 = <chesswithquests-ci-34708180783>
#let template_odbornaprace_repo = <template-odbornaprace-repo>
#let odbornaprace_mono_repo = <odbornaprace-mono-repo>
#let darkfactory_paper_5bc04974 = <darkfactory-paper-5bc04974>
#let darkfactory_paper_ci_35617820423 = <darkfactory-paper-ci-35617820423>
#let darkfactory_paper_deploy_35617820271 = <darkfactory-paper-deploy-35617820271>
#let darkfactory_paper_release_35617820286 = <darkfactory-paper-release-35617820286>
#let darkfactory_request_359 = <darkfactory-request-359>

#let vllm_inference_engine = <vllm-inference-engine>
#let openai_model_providers = <openai-model-providers>
#let openai_responses_temperature = <openai-responses-temperature>
#let github_pull_request_reviews = <github-pull-request-reviews>
#let github_spec_kit = <github-spec-kit>
#let github_required_status_checks = <github-required-status-checks>
#let openai_agents_hitl = <openai-agents-hitl>
#let microsoft_agent_workflows = <microsoft-agent-workflows>
#let microsoft_agent_looping = <microsoft-agent-looping>
#let kimi_agent_swarm = <kimi-agent-swarm>
#let openai_agents_md = <openai-agents-md>
#let openai_customization_overview = <openai-customization-overview>
#let claude_code_memory = <claude-code-memory>
#let claude_code_settings = <claude-code-settings>
#let claude_code_skills = <claude-code-skills>
#let openai_agents_sdk = <openai-agents-sdk>
#let openai_agents_tools = <openai-agents-tools>
#let openai_agents_run_state = <openai-agents-run-state>
#let openai_agents_sandbox = <openai-agents-sandbox>
#let openai_agents_sandbox_clients = <openai-agents-sandbox-clients>
#let mcp_spec_2026 = <mcp-spec-2026>
#let mcp_tools_2026 = <mcp-tools-2026>
#let mcp_ts_first_server = <mcp-ts-first-server>
#let anthropic_claude_code_interface = <anthropic-claude-code-interface>
#let google_antigravity_ide = <google-antigravity-ide>
#let bib = (
  darkfactory: darkfactory,
  humble2010: humble2010,
  chacon2014: chacon2014,
  vaswani2017: vaswani2017,
  anthropic_prompt: anthropic_prompt,
  yao2022: yao2022,
  liu2024: liu2024,
  ainslie2023: ainslie2023,
  lewis2020rag: lewis2020rag,
  jiang2023llmlingua: jiang2023llmlingua,
  agache2020firecracker: agache2020firecracker,
  sennrich2016bpe: sennrich2016bpe,
  mikolov2013word2vec: mikolov2013word2vec,
  mikolov2013linguistic: mikolov2013linguistic,
  mikolov2013compositionality: mikolov2013compositionality,
  kwon2023pagedattention: kwon2023pagedattention,
  sommerville2016: sommerville2016,
  anthropic2024tooluse: anthropic2024tooluse,
  karpathy2025vibecoding: karpathy2025vibecoding,
  willison2025vibecoding: willison2025vibecoding,
  cambridge2026aislop: cambridge2026aislop,
  agent_skills_spec: agent_skills_spec,
  anthropic_code_execution: anthropic_code_execution,
  coderabbit2026vibehistory: coderabbit2026vibehistory,
  openai_agents_sessions: openai_agents_sessions,
  openai_agents_guardrails: openai_agents_guardrails,
  claude_code_plugins: claude_code_plugins,
  claude_code_hooks: claude_code_hooks,
  github_branches: github_branches,
  github_pull_requests: github_pull_requests,
  anthropic_context_engineering: anthropic_context_engineering,
  anthropic_harness_design: anthropic_harness_design,
  anthropic_managed_agents: anthropic_managed_agents,
  owasp_prompt_injection: owasp_prompt_injection,
  openai_prompt_injection: openai_prompt_injection,
  openai_agent_orchestration: openai_agent_orchestration,
  hevner2004designscience: hevner2004designscience,
  peffers2007dsrm: peffers2007dsrm,
  gradually_ai_usage_2026: gradually_ai_usage_2026,
  epoch_eci_frontier_2026: epoch_eci_frontier_2026,
  artificial_analysis_intelligence_v4_3_2: artificial_analysis_intelligence_v4_3_2,
  brown2020: brown2020,
  owasp_llm01_prompt_injection: owasp_llm01_prompt_injection,
  darkfactory_e9c10221: darkfactory_e9c10221,
  darkfactory_ci_35616745304: darkfactory_ci_35616745304,
  omnis_a53660a1: omnis_a53660a1,
  omnis_ci_34708160162: omnis_ci_34708160162,
  chesswithquests_50a50797: chesswithquests_50a50797,
  chesswithquests_ci_34708180783: chesswithquests_ci_34708180783,
  template_odbornaprace_repo: template_odbornaprace_repo,
  odbornaprace_mono_repo: odbornaprace_mono_repo,
  darkfactory_paper_5bc04974: darkfactory_paper_5bc04974,
  darkfactory_paper_ci_35617820423: darkfactory_paper_ci_35617820423,
  darkfactory_paper_deploy_35617820271: darkfactory_paper_deploy_35617820271,
  darkfactory_paper_release_35617820286: darkfactory_paper_release_35617820286,
  darkfactory_request_359: darkfactory_request_359,
  vllm_inference_engine: vllm_inference_engine,
  openai_model_providers: openai_model_providers,
  openai_responses_temperature: openai_responses_temperature,
  github_pull_request_reviews: github_pull_request_reviews,
  github_spec_kit: github_spec_kit,
  github_required_status_checks: github_required_status_checks,
  openai_agents_hitl: openai_agents_hitl,
  microsoft_agent_workflows: microsoft_agent_workflows,
  microsoft_agent_looping: microsoft_agent_looping,
  kimi_agent_swarm: kimi_agent_swarm,
  openai_agents_md: openai_agents_md,
  openai_customization_overview: openai_customization_overview,
  claude_code_memory: claude_code_memory,
  claude_code_settings: claude_code_settings,
  claude_code_skills: claude_code_skills,
  openai_agents_sdk: openai_agents_sdk,
  openai_agents_tools: openai_agents_tools,
  openai_agents_run_state: openai_agents_run_state,
  openai_agents_sandbox: openai_agents_sandbox,
  openai_agents_sandbox_clients: openai_agents_sandbox_clients,
  mcp_spec_2026: mcp_spec_2026,
  mcp_tools_2026: mcp_tools_2026,
  mcp_ts_first_server: mcp_ts_first_server,
  anthropic_claude_code_interface: anthropic_claude_code_interface,
  google_antigravity_ide: google_antigravity_ide,
)

// ── Vizualizace a empirické snímky ──────────────────────────

#let adoption_figure = [
#figure(
  image("img/generated/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení světové populace podle nejpokročilejší používané kategorie generativní AI v srpnu 2026. Každý z 2 500 bodů představuje přibližně 3,3 milionu lidí; kategorie jsou vzájemně výlučné. Hodnota pro pravidelné uživatele AI coding agents je redakční, deduplikovaný odhad Gradually (25–35 milionů), přičemž graf používá střed 30 milionů, přibližně 0,36 % populace. #cite(bib.gradually_ai_usage_2026)],
)
]

#let eci_figure = [
#figure(
  image("img/generated/epoch-eci-frontier-2026-09-01.svg", width: 100%),
  caption: [Frontier pozorování a lineární trendy Epoch Capabilities Index (ECI) od přechodu k reasoning modelům v září 2024. Epoch uvádí přibližně 14 ECI bodů za rok pro reasoning frontier a přibližně 6 bodů za rok pro non-reasoning frontier; zdrojová data jsou ve verzi z 1. 9. 2026. Pro čitelnost v tisku nejsou zobrazeny 90% predikční intervaly. #cite(bib.epoch_eci_frontier_2026)],
)
]


#let evidence = json("data/phase2-evidence.json")
#let rows = evidence.artificial_analysis.rows
#let r0 = rows.at(0)
#let r1 = rows.at(1)
#let r2 = rows.at(2)
#let r3 = rows.at(3)
#let r4 = rows.at(4)

#let pct(value) = str(value) + " %"

#let benchmark_snapshot = [
#figure(
  text(size: 7.4pt)[
    #table(
      columns: (2.35fr, 1.05fr, 1.25fr, 1fr, 0.8fr),
      align: (left, left, center, center, center),
      inset: 3pt,
      [*Model*],
      [*Poskytovatel*],
      [*Artificial Analysis Intelligence Index*],
      [*Terminal-Bench 4.0*],
      [*SciCode*],
      [#r0.model], [#r0.provider], [#r0.index], [#pct(r0.terminal_bench_4_0_percent)], [#pct(r0.scicode_percent)],
      [#r1.model], [#r1.provider], [#r1.index], [#pct(r1.terminal_bench_4_0_percent)], [#pct(r1.scicode_percent)],
      [#r2.model], [#r2.provider], [#r2.index], [#pct(r2.terminal_bench_4_0_percent)], [#pct(r2.scicode_percent)],
      [#r3.model], [#r3.provider], [#r3.index], [#pct(r3.terminal_bench_4_0_percent)], [#pct(r3.scicode_percent)],
      [#r4.model], [#r4.provider], [#r4.index], [#pct(r4.terminal_bench_4_0_percent)], [#pct(r4.scicode_percent)],
    )
  ],
  caption: [Bodový snímek pěti nejvýše skórujících odlišných základních modelů podle Artificial Analysis Intelligence Index v4.3.2, zveřejněného 7. 9. 2026; hodnoty byly ověřeny 22. 9. 2026. U každého základního modelu je ponechána jeho nejvýše skórující vyhodnocená konfigurace. #cite(bib.artificial_analysis_intelligence_v4_3_2)],
)
]

// ── Typografická šablona a pomocné funkce (GJKT) ─────────────

#let PISMO = ("Caladea", "New Computer Modern")

#let string-word-count(string) = (
  characters: string.replace(regex("\s+"), "").clusters().len(),
  words: string.matches(regex("\b[\w'’.,\-]+\b")).len(),
  sentences: string.matches(regex("\w+\s*[.?!]")).len(),
)

#let concat-adjacent-text(children) = {
  if children.len() == 0 { return () }
  let squashed = (children.at(0),)
  let as-text(el) = {
    let fn = repr(el.func())
    if fn == "text" { el.text }
    else if fn == "space" { " " }
    else if fn in "linebreak" { "\n" }
    else if fn in "parbreak" { "\n\n" }
    else if fn in "pagebreak" { "\n\n\n\n" }
    else if fn == "smartquote" {
      if el.double { "\"" } else { "'" }
    }
  }
  let last-text = as-text(squashed.at(-1))
  for child in children.slice(1) {
    let has-label = child.at("label", default: none) != none
    if has-label {
      squashed.push(child)
      last-text = none
      continue
    }
    let this-text = as-text(child)
    let merge-with-last = last-text != none and this-text != none
    if merge-with-last {
      last-text = last-text + this-text
      squashed.at(-1) = text(last-text)
    } else {
      last-text = this-text
      squashed.push(child)
    }
  }
  squashed
}

#let IGNORED_ELEMENTS = (
  "bibliography", "cite", "display", "equation", "h", "hide", "image",
  "line", "linebreak", "locate", "metadata", "pagebreak", "parbreak",
  "path", "polygon", "ref", "repeat", "smartquote", "space", "style",
  "update", "v",
)

#let map-tree(f, content, exclude: IGNORED_ELEMENTS) = {
  if content == none { return none }
  let fn = repr(content.func())
  let fields = content.fields().keys()
  if fn in exclude {
    none
  } else if content.at("label", default: none) in exclude {
    none
  } else if fn in ("text", "raw") {
    f(content.text)
  } else if "children" in fields {
    let children = content.children
    if fn == "sequence" { children = concat-adjacent-text(children) }
    children.map(map-tree.with(f, exclude: exclude)).filter(x => x != none)
  } else if fn == "figure" {
    (
      if "figure-body" not in exclude { map-tree(f, content.body, exclude: exclude) },
      if "caption" in content.fields() { map-tree(f, content.caption, exclude: exclude) },
    ).filter(x => x != none)
  } else if fn == "styled" {
    map-tree(f, content.child, exclude: exclude)
  } else if "body" in fields {
    map-tree(f, content.body, exclude: exclude)
  } else {
    none
  }
}

#let extract-text(content, ..options) = {
  let out = (map-tree(x => x, content, ..options),).flatten().join(" ")
  out + ""
}

#let review-state = state("review-mode", sys.inputs.at("review", default: "false") in ("true", "1", "yes"))
#let word-stats-state = state("word-stats-state", (
  raw: (words: 0, chars: 0),
  review: (words: 0, chars: 0),
))

#let ui-label(cs, en) = cs

#let alert(body) = context if review-state.get() {
  [#block(fill: rgb("fefce8"), stroke: (left: 3pt + rgb("eab308")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("854d0e"), size: 10.5pt)[📐 *Strukturální upozornění:* #body]) <callout>]
} else { none }
#let struct-alert = alert

#let note(body) = context if review-state.get() {
  [#block(fill: rgb("ecfdf5"), stroke: (left: 3pt + rgb("10b981")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("065f46"), size: 10.5pt)[💡 *Návrh na vylepšení:* #body]) <callout>]
} else { none }

#let issue(body) = context if review-state.get() {
  [#block(fill: rgb("fef2f2"), stroke: (left: 3pt + rgb("ef4444")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("991b1b"), size: 10.5pt)[⚠️ *Chyba / Nesrovnalost k opravě:* #body]) <callout>]
} else { none }

#let critique(body) = context if review-state.get() {
  [#block(fill: rgb("fff7ed"), stroke: (left: 3pt + rgb("ea580c")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("9a3412"), size: 10.5pt)[🔥 *Hloubková kritika / Oponentura:* #body]) <callout>]
} else { none }

#let scope-note(body) = context if review-state.get() {
  [#block(fill: rgb("eff6ff"), stroke: (left: 3pt + rgb("3b82f6")), inset: (x: 10pt, y: 8pt), radius: (right: 4pt), width: 100%, text(fill: rgb("1e40af"), size: 10.5pt)[📌 *Metodické vymezení / Rozsah práce:* #body]) <callout>]
} else { none }
#let blue-note = scope-note

#let added(body) = context if review-state.get() {
  highlight(fill: rgb("#dafbe1"))[#text(fill: rgb("#116329"))[[#text("+ ") <diff-prefix>]#body]]
} else { body }
#let ai = added

#let draft(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#eab308"), offset: 2.5pt)[#body]
} else { none }
#let unconfirmed = draft

#let accepted(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#2563eb"), offset: 2.5pt)[#body]
} else { body }

#let finalized(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#16a34a"), offset: 2.5pt)[#body]
} else { body }

#let removed(body) = context if review-state.get() {
  [#highlight(fill: rgb("#ffebe9"))[#text(fill: rgb("#82071e"))[#text("- ")#body]] <removed-diff>]
} else { none }

#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(unconfirmed(new))]
} else { old }

#let semantic-term(value) = {
  assert(value.kind in ("concept", "section"), message: "term API expects a semantic concept or section")
  assert(value.term != none or value.keyword != none, message: "semantic item requires term or keyword: " + value.key)
  none
}

#let term-full-name(value) = {
  semantic-term(value)
  if value.term != none and value.keyword != none {
    value.term + " (" + value.keyword + ")"
  } else if value.term != none {
    value.term
  } else {
    value.keyword
  }
}

#let term-link-label(value) = {
  semantic-term(value)
  if value.kind == "section" {
    label("section-" + value.key)
  } else {
    label("concept-" + value.key)
  }
}

#let term(
  value,
  linked: true,
  marker: true,
  emphasized: true,
  cite: false,
) = context {
  semantic-term(value)
  let name = term-full-name(value)
  let displayed = if emphasized { [_*#name*_] } else { name }
  if linked {
    displayed = link(term-link-label(value), displayed)
  }
  if marker {
    [#displayed#super[#text(fill: rgb("#2563eb"), size: 0.72em)[#text("*")]]]
  } else {
    displayed
  }
}
#let kw = term
#let render-term = term

// ── Slovník pojmů (Vocabulary) ──────────────────────────────
#let terms = (
  agent_loop: (key: "agent_loop", term: "Agentní smyčka", keyword: "Agent Loop", kind: "concept"),
  agent_session: (key: "agent_session", term: "Agentní sezení", keyword: "Session", kind: "concept"),
  agentic_engineering: (key: "agentic_engineering", term: "Agentické inženýrství", keyword: none, kind: "section"),
  agents_directory: (key: "agents_directory", term: none, keyword: ".agents/", kind: "concept"),
  agents_md: (key: "agents_md", term: none, keyword: "AGENTS.md", kind: "concept"),
  branch: (key: "branch", term: "Větev", keyword: "Branch", kind: "concept"),
  claude_directory: (key: "claude_directory", term: none, keyword: ".claude/", kind: "concept"),
  claude_md: (key: "claude_md", term: none, keyword: "CLAUDE.md", kind: "concept"),
  code_execution: (key: "code_execution", term: "Spouštění kódu", keyword: "Code Execution", kind: "concept"),
  compaction: (key: "compaction", term: "Kompakce kontextu", keyword: "Context Compaction", kind: "concept"),
  context_engineering: (key: "context_engineering", term: "Kontextové inženýrství", keyword: "Context Engineering", kind: "concept"),
  context_injection: (key: "context_injection", term: "Vkládání kontextu", keyword: "Context Injection", kind: "concept"),
  context_rot: (key: "context_rot", term: "Degradace kontextu", keyword: "Context Rot", kind: "concept"),
  context_window: (key: "context_window", term: "Kontextové okno", keyword: "Context Window", kind: "concept"),
  continuous_integration: (key: "continuous_integration", term: "Průběžná integrace", keyword: "CI", kind: "concept"),
  embedding: (key: "embedding", term: "Vektorová reprezentace", keyword: "Embedding", kind: "concept"),
  environment: (key: "environment", term: "Prostředí agenta", keyword: "Agent Environment", kind: "concept"),
  goal_loops: (key: "goal_loops", term: "Cílené smyčky", keyword: "Goal Loops", kind: "concept"),
  guardrail: (key: "guardrail", term: none, keyword: "Guardrail", kind: "concept"),
  handoff: (key: "handoff", term: "Předání řízení", keyword: "Handoff", kind: "concept"),
  harness: (key: "harness", term: none, keyword: "Harness", kind: "section"),
  hooks: (key: "hooks", term: none, keyword: "Hooks", kind: "concept"),
  human_in_the_loop: (key: "human_in_the_loop", term: "Člověk ve smyčce", keyword: "HITL", kind: "concept"),
  inference_engine: (key: "inference_engine", term: "Inferenční engine", keyword: "Inference Engine", kind: "concept"),
  integration_test: (key: "integration_test", term: "Integrační test", keyword: "Integration Test", kind: "concept"),
  karpathy_vibe_coding_tweet: (key: "karpathy_vibe_coding_tweet", term: "Původ termínu Vibe Coding", keyword: none, kind: "concept"),
  kv_cache: (key: "kv_cache", term: "Mezipaměť klíčů a hodnot", keyword: "KV Cache", kind: "concept"),
  language_model: (key: "language_model", term: "Velký jazykový model", keyword: "LLM", kind: "concept"),
  mcp: (key: "mcp", term: none, keyword: "MCP", kind: "concept"),
  model_provider: (key: "model_provider", term: "Poskytovatel modelu", keyword: "Model Provider", kind: "concept"),
  orchestrator: (key: "orchestrator", term: "Orchestrátor", keyword: none, kind: "concept"),
  planning: (key: "planning", term: "Plánování", keyword: "Planning", kind: "concept"),
  plugins: (key: "plugins", term: "Plugin", keyword: none, kind: "concept"),
  prompt_engineering: (key: "prompt_engineering", term: "Promptové inženýrství", keyword: "Prompt Engineering", kind: "concept"),
  prompt_injection: (key: "prompt_injection", term: none, keyword: "Prompt Injection", kind: "concept"),
  pull_request: (key: "pull_request", term: none, keyword: "Pull Request", kind: "concept"),
  rag: (key: "rag", term: none, keyword: "RAG", kind: "concept"),
  review: (key: "review", term: "Revize", keyword: "Review", kind: "concept"),
  sandbox: (key: "sandbox", term: "Izolované prostředí", keyword: "Sandbox", kind: "concept"),
  scripts: (key: "scripts", term: "Skript", keyword: none, kind: "concept"),
  skills: (key: "skills", term: "Dovednosti", keyword: "Skills", kind: "concept"),
  slop: (key: "slop", term: none, keyword: "Slop", kind: "concept"),
  spec_driven_development: (key: "spec_driven_development", term: "Vývoj řízený specifikací", keyword: "Spec-Driven Development", kind: "concept"),
  state: (key: "state", term: "Stav", keyword: "State", kind: "concept"),
  subagent: (key: "subagent", term: none, keyword: "Subagent", kind: "concept"),
  swarm: (key: "swarm", term: none, keyword: "Swarm", kind: "concept"),
  system_prompt: (key: "system_prompt", term: "Systémový prompt", keyword: "System Prompt", kind: "concept"),
  temperature: (key: "temperature", term: "Teplota", keyword: "Temperature", kind: "concept"),
  token: (key: "token", term: none, keyword: "Token", kind: "concept"),
  tokenizer: (key: "tokenizer", term: "Tokenizér", keyword: none, kind: "concept"),
  tool_calling: (key: "tool_calling", term: "Vyvolávání nástrojů", keyword: "Tool Calling", kind: "concept"),
  tools: (key: "tools", term: "Nástroje", keyword: "Tools", kind: "concept"),
  transcript: (key: "transcript", term: "Přepis", keyword: "Transcript", kind: "concept"),
  transformer: (key: "transformer", term: none, keyword: "Transformer", kind: "concept"),
  version_control: (key: "version_control", term: "Správa verzí", keyword: "Version Control", kind: "concept"),
  vibe_coding: (key: "vibe_coding", term: none, keyword: "Vibe Coding", kind: "concept"),
  workflow_graphs: (key: "workflow_graphs", term: "Graf pracovního postupu", keyword: "Workflow Graph", kind: "concept"),
)


#let regular-level-one-heading(it) = block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
#let nadpis-bez-cisla(text-nadpisu) = heading(numbering: none, outlined: true, bookmarked: false, text-nadpisu)

#let meta = (
  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,
  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,
  annotation-cs: [
    Odborná práce zkoumá využití agentní umělé inteligence při vývoji softwaru se zaměřením na architekturu agentního harnessu.
    Teoretická část vysvětluje jazykový model, inferenci a Harness; praktická část popisuje Agentické inženýrství a jeho realizaci v DarkFactory.
    Výsledky a diskuse vyhodnocují dostupné důkazy z implementace, testů, CI a cílových repozitářů.
    Evaluace používá zdrojový kód, automatické testy a CI výsledky a výslovně rozlišuje prokázané mechanismy od neprokázaného plného produkčního průchodu.
  ],
  abstract-en: [
    This thesis examines the use of agentic artificial intelligence in software development, focusing on the architecture of an agent harness.
    The theoretical part explains the language model, inference, and the harness; the practical part describes Agentic Engineering and its realization in DarkFactory.
    Results and discussion evaluate the available evidence from implementation, tests, CI, and target repositories.
    The evaluation uses source code, automated tests, and CI results and explicitly distinguishes demonstrated mechanisms from a full production lifecycle that was not demonstrated.
  ],
  podekovani: none,
)

#set document(title: "AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory", author: meta.autor)
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
  footer: none,
)
#set text(font: PISMO, size: 12pt, lang: "cs", hyphenate: true)
#set par(justify: true, leading: 1.5 * 0.65em, spacing: 8pt, first-line-indent: 0pt)
#show par: it => block(breakable: false, it)

#set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
#set std.terms(indent: 0pt, hanging-indent: 1.6em, spacing: 4pt)
#show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)
#show std.terms: it => block(above: 3pt, below: 5pt, breakable: true, it)

#set heading(numbering: "1.1")
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  regular-level-one-heading(it)
}
#show heading.where(level: 2): it => pad(left: 0.75em)[#block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))]
#show heading.where(level: 3): it => pad(left: 1.5em)[#block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))]
#show heading.where(level: 4): it => pad(left: 2.25em)[#block(above: 14pt, below: 6pt, sticky: true, text(size: 11pt, weight: "bold", it))]
#show heading.where(level: 5): it => pad(left: 3em)[#block(above: 12pt, below: 5pt, sticky: true, text(size: 10.5pt, weight: "bold", it))]
#show heading.where(level: 6): it => pad(left: 3.75em)[#block(above: 10pt, below: 4pt, sticky: true, text(size: 10pt, weight: "bold", it))]

#show figure.caption: set text(size: 10pt)
#show raw: set text(font: ("DejaVu Sans Mono",), size: 9.5pt)
#show raw.where(block: true): it => block(
  fill: rgb("#1e293b"), stroke: 0.5pt + rgb("#334155"), inset: (x: 10pt, y: 8pt), radius: 4pt, width: 100%,
  text(fill: rgb("#f1f5f9"), it),
)
#show raw.where(block: false): it => box(
  fill: rgb("#f1f5f9"), stroke: 0.3pt + rgb("#cbd5e1"), inset: (x: 3pt, y: 1pt), radius: 2pt,
  text(fill: rgb("#0f172a"), it),
)
#show link: set text(fill: rgb("#0b4f9e"))
#show cite: it => super(it)
#set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
#set figure(numbering: "1")

// ── Přední část ──────────────────────────────────────────

// Titulní strana
#align(center)[
  #v(1cm)
  #text(size: 14pt, weight: "bold", meta.skola)
  #v(1fr)
  #text(size: 26pt, weight: "bold", hyphenate: false)[AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory]
  #v(0.7cm)
  #text(size: 15pt, tracking: 2pt)[ODBORNÁ PRÁCE]
  #v(1fr)
]
#align(left)[
  #set text(size: 12pt)
  #context {
    let s = word-stats-state.final()
    let range-line(stats) = [Rozsah práce: #stats.words slov / #stats.chars znaků]
    let rozsahy = stack(
      dir: ttb,
      spacing: 3pt,
      range-line(s.raw),
      unconfirmed(range-line(s.review)),
    )
    grid(
      columns: (1fr, auto),
      column-gutter: 1.2em,
      row-gutter: 4pt,
      [Autor práce: #meta.autor, #meta.trida],
      rozsahy,
      [Vedoucí práce: #meta.vedouci],
      none,
    )
  }
  #v(0.8cm)
  #align(center)[#text(size: 12pt, str(meta.rok))]
]
#pagebreak()

// Prohlášení
#nadpis-bez-cisla[Prohlášení]
Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval/a
samostatně pod dohledem vedoucího uvedeného na první straně. Všechny
použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané
jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby
tištěná forma práce byla uchována na #meta.skola a tam používána jako
tištěný zdroj např. pro další studentské práce či pro prezentaci
vzdělávání na #meta.skola-zkratka.

#v(1.5cm)
V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))
#pagebreak()

// Anotace a klíčová slova
#nadpis-bez-cisla[Anotace]
#meta.annotation-cs

#nadpis-bez-cisla[Abstract]
#meta.abstract-en

#nadpis-bez-cisla[Klíčová slova]

#text(size: 11pt, fill: black)[.agents/, .claude/, Agentní sezení (Session), Agentní smyčka (Agent Loop), AGENTS.md, CLAUDE.md, Cílené smyčky (Goal Loops), Degradace kontextu (Context Rot), Dovednosti (Skills), Graf pracovního postupu (Workflow Graph), Guardrail, Harness, Hooks, Inferenční engine (Inference Engine), Integrační test (Integration Test), Izolované prostředí (Sandbox), Kompakce kontextu (Context Compaction), Kontextové inženýrství (Context Engineering), Kontextové okno (Context Window), MCP, Mezipaměť klíčů a hodnot (KV Cache), Nástroje (Tools), Plánování (Planning), Poskytovatel modelu (Model Provider), Prompt Injection, Promptové inženýrství (Prompt Engineering), Prostředí agenta (Agent Environment), Průběžná integrace (CI), Pull Request, Předání řízení (Handoff), Přepis (Transcript), RAG, Revize (Review), Slop, Spouštění kódu (Code Execution), Správa verzí (Version Control), Stav (State), Subagent, Swarm, Systémový prompt (System Prompt), Teplota (Temperature), Token, Transformer, Vektorová reprezentace (Embedding), Velký jazykový model (LLM), Vibe Coding, Vkládání kontextu (Context Injection), Vyvolávání nástrojů (Tool Calling), Vývoj řízený specifikací (Spec-Driven Development), Větev (Branch), Člověk ve smyčce (HITL)]
#pagebreak()

// Obsah
#outline(title: [Obsah], depth: 99, indent: 1.4em)

// ── Vlastní text ─────────────────────────────────────────

#set page(footer: context {
  align(center, text(font: PISMO, size: 11pt, counter(page).display("1")))
})
#metadata("body-start") <body-start-anchor>

#heading(level: 1)[Úvod] <section-thesis_introduction>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Práce se zabývá použitím agentní AI při vývoji softwaru a technickými podmínkami, které umožňují delegovat delší úlohy bez ztráty kontroly nad stavem, účinky a ověřením výsledku.
]

Předmětem práce není trénování jazykových modelů, ale systémové vrstvy potřebné pro jejich praktické použití jako součásti agentního vývojového procesu. Východisko a argument, podle kterého je tato otázka dále rozpracována, stanovuje část 1.2.

#heading(level: 2)[Motivace a vymezení problému] <section-motivation_problem_definition>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Rozsah využití generativní AI a rychlý vývoj modelových schopností vytvářejí nové možnosti pro vývoj softwaru. Samotná dostupnost schopného modelu však neurčuje, jak je softwarová práce zadána, provedena, ověřena a řízena.
]

Používání generativní AI je už globálně rozšířené. Gradually ve svém srpnovém odhadu z roku 2026 rozděluje světovou populaci do čtyř vzájemně výlučných kategorií podle nejpokročilejšího způsobu používání AI: 1 771 z 2 500 bodů připadá na lidi, kteří generativní AI nikdy vědomě nepoužili, 696 na uživatele bezplatných chatbotů, 24 na platící uživatele a 9 na pravidelné uživatele AI coding agents. #cite(bib.gradually_ai_usage_2026)

#adoption_figure

Poslední kategorie nesmí být čtena jako globální sčítání uživatelů. Gradually ji výslovně uvádí jako redakční, deduplikovaný odhad 25–35 milionů pravidelných uživatelů; vizualizace používá střed 30 milionů, tedy přibližně 0,36 % světové populace. #cite(bib.gradually_ai_usage_2026) Rozdíl mezi širokým používáním generativní AI a podstatně menším odhadovaným počtem uživatelů coding agents ukazuje, že pokročilé agentní použití zůstává relativně úzkou podmnožinou celkové adopce.

#block[
Jedním z rozpoznatelných způsobů AI-asistovaného programování je Vibe Coding: způsob tvorby softwaru, při kterém člověk iteruje pomocí pokynů v přirozeném jazyce bez průběžné kontroly vygenerovaného kódu. #cite(bib.karpathy2025vibecoding)
] <concept-vibe_coding>

Termín zavedl Andrej Karpathy v roce 2025. Jeho popis představuje nízkostrukturovaný způsob interakce s generativním systémem a poskytuje užitečný kontrast k postupu, který před delegováním práce explicitně formuluje specifikaci, plán a podmínky ověření. #cite(bib.karpathy2025vibecoding) #cite(bib.willison2025vibecoding) Existence tohoto způsobu práce sama o sobě nevypovídá o tom, jak velká část uživatelů coding agents takto postupuje.

#block[Tweet Andreje Karpathyho z 2. února 2025, ve kterém popsal původní význam Vibe Coding.] <concept-karpathy_vibe_coding_tweet>

#figure(
  image("img/external/karpathy-vibe-coding.png", width: 92%),
  caption: [Původní tweet Andreje Karpathyho o Vibe Coding. #cite(bib.karpathy2025vibecoding) #cite(bib.coderabbit2026vibehistory)],
)

Takový způsob práce může zrychlit průzkumné prototypování, ale bez explicitních kontrol zvyšuje význam následné revize, testů a sledovatelnosti změn. V této práci proto Vibe Coding slouží jako současný kontrast k záměrně strukturovanému agentickému inženýrství, nikoli jako popis celé populace uživatelů AI pro programování.

Současně se zvyšují schopnosti samotných modelů. Epoch AI na datech Epoch Capabilities Index (ECI) zpřístupněných k 1. září 2026 odhaduje po nástupu reasoning modelů v září 2024 tempo posunu frontier přibližně 14 ECI bodů za rok, zatímco pro non-reasoning frontier přibližně 6 bodů za rok. ECI je kompozitní index skládající více benchmarků do jedné škály schopností; nejde o univerzální měřítko inteligence. #cite(bib.epoch_eci_frontier_2026)

#eci_figure

Artificial Analysis Intelligence Index v4.3.2 poskytuje bodový snímek současných modelových schopností napříč deseti evaluacemi, mezi nimi Terminal-Bench 4.0 a SciCode. Jde o kompozitní benchmark, nikoli o univerzální pořadí modelů pro každé použití. #cite(bib.artificial_analysis_intelligence_v4_3_2)

#benchmark_snapshot

Dílčí výsledky ukazují rozdílné profily schopností. Claude Fable 5.1 (Max, default fallback) a GPT-6 Astra (max) mají v tomto snímku shodný agregovaný index 53, ale GPT-6 Astra dosahuje vyššího výsledku v Terminal-Bench 4.0 (59 % oproti 52 %), zatímco Claude Fable 5.1 dosahuje vyššího výsledku v SciCode (63 % oproti 56 %). #cite(bib.artificial_analysis_intelligence_v4_3_2) Agregované pořadí a pořadí na jednotlivých benchmarkech se tedy mohou lišit, protože modelová schopnost je vícerozměrná.

Epoch i Artificial Analysis zachycují modelové schopnosti prostřednictvím benchmarků a trendů. Takové výsledky samy o sobě neprokazují spolehlivost reálného softwarově-inženýrského workflow: benchmark modelu nevymezuje perzistentní stav úlohy, provedení nástrojů, interakci s prostředím, ověření účinků, správu kontextu, orchestraci ani způsob řízení změny. #cite(bib.anthropic_context_engineering) #cite(bib.anthropic_harness_design)

Současné agentní systémy proto stavějí kolem modelové inference další běhovou a řídicí vrstvu, která propojuje model se stavem, nástroji, prostředím a kontrolními mechanismy. #cite(bib.anthropic2024tooluse) #cite(bib.anthropic_managed_agents) Technický problém práce tak neleží pouze ve schopnosti modelu generovat kód, ale v tom, jak tyto okolní mechanismy záměrně navrhnout a použít pro delší, ověřitelnou softwarovou práci.

Práce na tento problém odpovídá ve čtyřech navazujících krocích: teoretická část vysvětluje model, inferenci a Harness; praktická část vymezuje postupy Agentického inženýrství; DarkFactory tyto postupy konkrétně realizuje; a část Výsledky a diskuse hodnotí dostupné implementační a provozní důkazy.

#heading(level: 2)[Východisko a argument práce] <section-thesis_argument>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Východiskem práce je návaznost model → Harness → Agentické inženýrství → DarkFactory.
]

Jazykový model poskytuje inferenci nad aktivním tokenovým kontextem. #cite(bib.brown2020) Harness z jednotlivých inferenčních kroků vytváří agentní runtime tím, že udržuje stav, opakuje smyčku, zprostředkovává nástroje a prostředí a poskytuje mechanismy rozšíření. #cite(bib.anthropic_managed_agents)

Agentické inženýrství určuje, jak jsou tyto schopnosti záměrně použity pro softwarovou práci: jak se formuluje zadání, řídí změna, spravuje kontext, ověřuje výsledek a koordinuje více kroků nebo agentů. DarkFactory je implementační artefakt, na kterém jsou tyto postupy realizovány a následně vyhodnoceny. Úplné definice jednotlivých mechanismů jsou ponechány příslušným teoretickým a praktickým částem.

#heading(level: 2)[Cíle] <section-thesis_objectives>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Tato část stanovuje hlavní a dílčí cíle.
]

Cíle vymezují, jaký artefakt má být navržen a které jeho vlastnosti mají být technicky ověřeny. Výzkumné otázky jsou odděleny do následující samostatné části.

#heading(level: 3)[Hlavní cíl] <section-main_goal>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Navrhnout a implementovat architekturu Harnessu pro dlouhotrvající vývoj softwaru, která odděluje jazykový model od trvalého stavu, prostředí a deterministických kontrolních mechanismů, a technicky ověřit vlastnosti této architektury na systému DarkFactory.
]

DarkFactory je implementační artefakt této architektury. Splnění cíle se posuzuje podle dohledatelné implementace navržených mechanismů a reprodukovatelných testovacích nebo provozních důkazů. Úplný živý životní cyklus změny je samostatná úroveň ověření a nesmí být zaměněn za samotnou existenci architektury nebo úspěšné komponentové testy.

#heading(level: 3)[Dílčí cíle] <section-subgoals>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  - Vymezit teoretické mechanismy AI-asistovaného vývoje, jazykového modelu a inference, Harnessu a Agentického inženýrství potřebné pro dlouhotrvající agentní vývoj softwaru.
- Navrhnout a implementovat DarkFactory s explicitním stavem běhu, odděleným prostředím, rozšiřitelným capability rozhraním, GitHubem jako řídicí vrstvou a oddělenými hranicemi lidské a strojové identity.
- Implementovat mechanismy řízeného životního cyklu změny: plánování, deterministické ověření, smyčku revize a opravy, finální kontrolu souladu, integraci a obnovu přerušeného běhu.
- Ověřit implementované mechanismy automatickými testy a CI nad konkrétním commitem.
- Ověřit přenositelnost vybraných částí řešení na konkrétních cílových repozitářích a samostatně vyhodnotit, zda existuje důkaz úplného živého životního cyklu změny.
- Vztáhnout zjištěné výsledky a jejich omezení přímo k výzkumným otázkám.
]

Dílčí cíle oddělují teoretické vymezení, konstrukci artefaktu a jednotlivé úrovně jeho ověření. Nesplněná nebo neprokázaná úroveň evaluace proto nemusí být nahrazena silnějším tvrzením z jiné vrstvy důkazů.

#heading(level: 2)[Výzkumné otázky] <section-research_questions>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  - O1: Které mechanismy agentního harnessu a vývojového životního cyklu umožňují agentovi samostatně provádět softwarovou změnu, zatímco rozhodnutí s vyšším dopadem zůstávají explicitně řízena člověkem?
- O2: Jak může agentní harness omezit nebo obnovit neproduktivní či přerušený běh bez ztráty již ověřeného stavu a bez opakování přijatých deterministických účinků?
- O3: Jak lze oddělit trvalý stav dlouhotrvající úlohy od omezeného kontextového okna modelu tak, aby bylo možné práci po přerušení bezpečně obnovit a pokračovat v ní?
]

O1 sleduje řízenou autonomii, O2 odolnost provádění a O3 kontinuitu stavu přes hranice jednotlivých modelových kontextů a běhů. Otázky jsou záměrně formulovány tak, aby na ně bylo možné odpovědět konkrétními architektonickými prvky a reprodukovatelnými důkazy z implementace.

#heading(level: 2)[Metodika] <section-methodology>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Práce kombinuje rešerši odborné literatury, technických specifikací a primární dokumentace s konstrukčním přístupem odpovídajícím design science. #cite(bib.hevner2004designscience) #cite(bib.peffers2007dsrm)
]

Nejprve jsou v teoretické části vysvětleny mechanismy jazykového modelu, inference a Harnessu v rozsahu potřebném pro porozumění agentnímu systému. Na ně navazuje syntéza postupů Agentického inženýrství pro zadávání, řízení změny, ověřování, práci s kontextem a orchestraci.

Tyto postupy jsou následně realizovány v systému DarkFactory. Vyhodnocení používá jako důkaz zdrojový kód, automatické testy, CI a dohledatelné artefakty z cílových repozitářů; síla každého závěru je omezena na rozsah skutečně dostupných reprodukovatelných důkazů.

#heading(level: 2)[Struktura práce] <section-thesis_structure>
Kapitola 2, Teoretická část, vysvětluje fungování jazykového modelu, inference a Harnessu. Kapitola 3, Praktická část, popisuje postupy Agentického inženýrství a jejich konkrétní realizaci v DarkFactory. Kapitola 4 shrnuje výsledky, odpovídá na výzkumné otázky a diskutuje omezení dostupných důkazů. Kapitola 5 práci uzavírá ve vztahu k jejím cílům a zjištěním.

#heading(level: 1)[Teoretická část] <section-theory>
Teoretická část vymezuje mechanismy potřebné k porozumění tomu, jak agentní systém pracuje. Jazykový model a inference vysvětlují vznik modelového výstupu; Harness vysvětluje běhovou vrstvu, která zajišťuje kontinuitu, nástroje a interakci s prostředím.

#heading(level: 2)[Jazykový model] <section-model>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Jazykový model převádí tokenový kontext na inferenční výstup; výsledné chování proto závisí jak na reprezentaci vstupu a architektuře modelu, tak na způsobu provedení inference a jejích runtime omezeních. #cite(bib.brown2020) #cite(bib.vaswani2017)
]

Modelová vrstva končí vytvořením výstupu nad aktuálním kontextem. Trvalý stav úlohy, účinky v externím prostředí, nástroje a dlouhodobé řízení patří až do Harnessu.

#heading(level: 3)[Architektura a reprezentace] <section-model_architecture_representation>
#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Velký jazykový model (LLM)] <concept-language_model>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Velký jazykový model (LLM) je parametrický model pravděpodobnostního rozdělení nad posloupnostmi tokenů; autoregresivní LLM generuje pokračování postupným odhadem dalšího tokenu z již dostupného kontextu. #cite(bib.brown2020)
]

Při inferenci model převádí aktivní posloupnost tokenů na distribuci možných pokračování a z ní vytváří výstup. Současné generativní LLM jsou často založeny na architektuře #term(terms.transformer), ale modelová inference sama nepředstavuje perzistentní pracovní stav, vykonání nástroje ani změnu externího prostředí. #cite(bib.vaswani2017)

#block[#strong[GPT-3.] Brown et al. popisují GPT-3 jako autoregresivní jazykový model se 175 miliardami parametrů, který při evaluaci provádí zero-shot, one-shot a few-shot úlohy pouze z textového kontextu bez gradientních aktualizací vah. #cite(bib.brown2020)] <example-language_model_gpt3>

[#emph[Praktický význam:] Model dodává inferenční schopnost potřebnou pro generování, klasifikaci nebo volbu dalšího kroku. Perzistentní stav workflow, skutečné vykonání nástrojů, účinky v prostředí a dlouhodobá orchestrace proto musí vzniknout mimo samotný model.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Transformer] <concept-transformer>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Transformer je architektura neuronové sítě, která zpracovává vztahy v sekvenci pomocí mechanismů pozornosti místo rekurence či konvoluce jako základního mechanismu pro přenos informace mezi pozicemi. #cite(bib.vaswani2017)
]

Původní architektura Transformer má enkodér a dekodér; autoregresivní chování vzniká v dekodéru maskováním přístupu k budoucím tokenům a postupným vytvářením dalšího výstupu. Transformer tedy není synonymem pro autoregresivní LLM, ale jeho pozornostní mechanismus tvoří základ zpracování aktivního kontextu v mnoha současných jazykových modelech. #cite(bib.vaswani2017)

#block[#strong[Původní Transformer.] Vaswani et al. demonstrují Transformer na strojovém překladu: enkodér i dekodér skládají vrstvy pozornosti a dopředných sítí, přičemž maskovaná self-attention v dekodéru brání přístupu k budoucím pozicím během autoregresivní predikce. #cite(bib.vaswani2017)] <example-transformer_original_architecture>

[#emph[Praktický význam:] Pozornost umožňuje, aby výpočet dalšího výstupu podmiňovaly informace z aktivního kontextu. Informace, které mají přetrvat mezi inferenčními běhy nebo mimo dostupný kontext, však musí udržovat okolní systém.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Tokenizér] <concept-tokenizer>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Tokenizér je komponenta, která podle slovníku a segmentačních pravidel mapuje vstup na posloupnost diskrétních tokenů a jejich identifikátorů a umožňuje odpovídající zpětné dekódování. #cite(bib.sennrich2016bpe)
]

Subword tokenizace dělí text na jednotky menší než celé slovo, takže model nepotřebuje samostatnou položku slovníku pro každé možné slovo. BPE postupně slučuje časté sousední jednotky a vytváří omezený slovník, z něhož lze skládat i dříve neviděná slova. #cite(bib.sennrich2016bpe)

#block[#strong[Subword BPE.] Sennrich et al. používají Byte Pair Encoding pro překlad angličtiny do němčiny a ruštiny tak, aby omezený slovník reprezentoval otevřenou slovní zásobu sekvencemi subword jednotek; v analýze uvádějí německý kompozit „Sonnensystem“ složený z „Sonne“ a „System“. #cite(bib.sennrich2016bpe)] <example-tokenizer_bpe_sennrich>

[#emph[Praktický význam:] Zvolená tokenizace určuje, kolik tokenů spotřebují instrukce, historie, zdrojový kód i výsledky nástrojů. Stejný text tak může podle tokenizéru zabírat odlišnou část vstupní nebo výstupní kapacity modelu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Token] <concept-token>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Token je diskrétní jednotka sekvence identifikovaná položkou slovníku tokenizéru; podle tokenizační metody může odpovídat celému slovu, části slova nebo jinému textovému fragmentu. #cite(bib.sennrich2016bpe)
]

Token se od tokenizéru liší tím, že je výslednou sekvenční jednotkou, zatímco tokenizér určuje pravidla jejího vzniku. Před vstupem do vrstev Transformeru se identifikátory vstupních tokenů mapují na spojité naučené vektory. #cite(bib.vaswani2017)

#block[#strong[Token pod úrovní slova.] Subword přístup Sennricha et al. reprezentuje vzácná a neznámá slova jako posloupnost menších jednotek namísto jediné položky celého slova; rozbor německých kompozit, například „Sonnensystem“ („Sonne“ + „System“), ukazuje, proč token nemusí odpovídat jednomu slovu. #cite(bib.sennrich2016bpe)] <example-token_subword_sennrich>

[#emph[Praktický význam:] Tokeny jsou jednotkou, podle níž se vyjadřuje délka aktivního kontextu a generovaného výstupu. Agentní systém proto musí sledovat, kolik tokenů zabírají instrukce, historie, data i nástrojové výsledky.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Vektorová reprezentace (Embedding)] <concept-embedding>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Embedding je spojitá vícerozměrná vektorová reprezentace diskrétního prvku, v níž se naučené geometrické vztahy mohou využít k zachycení podobnosti a dalších vztahů mezi reprezentovanými objekty. #cite(bib.mikolov2013word2vec)
]

Uvnitř Transformeru se identifikátory tokenů mapují na naučené vektory, které vstupují do neuronového zpracování. #cite(bib.vaswani2017) Vektorové reprezentace však lze používat i mimo samotnou inferenci jazykového modelu, například pro porovnání blízkosti reprezentací; jde o obecnější použití než interní tokenové embeddingy. #cite(bib.mikolov2013word2vec)

#block[#strong[Analogie král − muž + žena ≈ královna.] Mikolov, Yih a Zweig ukazují, že rozdílové vektory naučených slovních reprezentací mohou zachycovat sémantické vztahy; klasickým příkladem je vektor blízký vztahu „King − Man + Woman ≈ Queen“. #cite(bib.mikolov2013linguistic)] <example-embedding_royalty_2d>

#figure(
  image("img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrativní 2D projekce vztahu král − muž + žena ≈ královna. Osy Pohlaví a Královský status jsou vysvětlující projekcí pro názornost, nikoli doslovnými naučenými dimenzemi nebo produkčními souřadnicemi embeddingového prostoru.],
)

#block[#strong[Dvě relační rodiny v projekci.] Vedle vztahu pohlaví a královského statusu ukazují práce o word embeddings také relační rodinu země–hlavní město; Mikolov et al. uvádějí například vztah „Madrid − Spain + France ≈ Paris“. Druhá rovina proto pedagogicky zobrazuje analogickou dvojici Francie–Paříž a Itálie–Řím bez tvrzení, že zakreslené souřadnice odpovídají skutečným naučeným osám. #cite(bib.mikolov2013compositionality) #cite(bib.mikolov2013linguistic)] <example-embedding_semantic_space_3d>

#figure(
  image("img/vector-embedding-3d.svg", width: 100%),
  caption: [Pedagogická 3D projekce dvou relačních rodin. Reálné embeddingové prostory jsou vysokodimenzionální; osy Pohlaví, Královský status a Další sémantická dimenze jsou pouze vysvětlující projekční pomůcky a nepředstavují doslovné produkční souřadnice embeddingu.],
)

[#emph[Praktický význam:] Vektorové reprezentace umožňují řadit nebo vyhledávat položky podle sémantické podobnosti, což je užitečné při výběru relevantních informací pro další modelový krok. Samotný embedding přitom neurčuje, jak se vybraný kontext následně spravuje nebo používá.]

#heading(level: 3)[Inference] <section-model_inference>
#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Poskytovatel modelu (Model Provider)] <concept-model_provider>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Poskytovatel modelu je externí služba nebo programové rozhraní, přes které runtime vybírá a volá konkrétní model; provider může mapovat abstraktní jméno modelu na vlastní implementaci modelového API. #cite(bib.openai_model_providers)
]

Provider není samotný jazykový model ani lokální inferenční engine. Zprostředkovává přístup k modelům a určuje kontrakt požadavku, dostupné schopnosti a provozní omezení daného rozhraní; různí provideři proto mohou stejnou roli realizovat odlišnými API. #cite(bib.openai_model_providers)

#block[#strong[OpenAI Agents SDK.] Dokumentace OpenAI Agents SDK ukazuje konfiguraci modelu řetězcem, například `RunConfig(model="gpt-5.6-sol")`; výchozí OpenAI provider tento název překládá na konkrétní modelové rozhraní založené na Responses API. #cite(bib.openai_model_providers)] <example-model_provider_openai_agents>

[#emph[Praktický význam:] Volba poskytovatele určuje, ke kterým modelům a schopnostem má agentní runtime přístup, jaké požadavky musí vytvářet a s jakými limity musí počítat. Oddělená provider vrstva umožňuje měnit způsob přístupu bez změny významu samotného modelu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Inferenční engine (Inference Engine)] <concept-inference_engine>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Inferenční engine je běhová vrstva, která načítá model a skutečně provádí jeho dopředné výpočty a autoregresivní generování nad vstupními tokeny. #cite(bib.vllm_inference_engine)
]

Serving engine může kromě samotného výpočtu plánovat a dávkovat požadavky, spravovat akcelerátorovou paměť a organizovat KV cache. Tím se liší od poskytovatele modelu: provider je přístupové rozhraní nebo služba, zatímco inference engine řeší fyzické provedení modelu a správu runtime prostředků. #cite(bib.kwon2023pagedattention)

#block[#strong[vLLM a PagedAttention.] vLLM používá mechanismus PagedAttention pro správu KV cache po blocích místo požadavku na jeden souvislý paměťový prostor; práce Kwon et al. popisuje tuto paměťovou správu jako součást serving systému pro LLM. #cite(bib.kwon2023pagedattention) #cite(bib.vllm_inference_engine)] <example-inference_engine_vllm_pagedattention>

[#emph[Praktický význam:] Vlastnosti inference enginu ovlivňují latenci, propustnost, využití paměti a tím i cenu nebo proveditelnost opakovaných a dlouhotrvajících modelových volání. Tyto vlastnosti jsou důležité i tehdy, když je engine skryt za vzdáleným provider API.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Teplota (Temperature)] <concept-temperature>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Teplota je parametr vzorkování, který u rozhraní, jež jej podporují, mění koncentraci pravděpodobnostního výběru dalších tokenů a tím ovlivňuje variabilitu generovaného výstupu. #cite(bib.openai_responses_temperature)
]

Nižší teplota typicky soustřeďuje výběr na pravděpodobnější pokračování, zatímco vyšší hodnota připouští větší variabilitu. Nelze ji ztotožnit s jednoduchým přepínačem determinismu: přesný rozsah, význam a interakce s dalšími sampling parametry jsou vlastností konkrétního modelového rozhraní. #cite(bib.openai_responses_temperature)

#block[#strong[OpenAI Responses API.] OpenAI u rozhraní Responses dokumentuje `temperature` v rozsahu 0 až 2 a jako příklady uvádí vyšší hodnotu 0,8 pro náhodnější výstup a nižší hodnotu 0,2 pro soustředěnější výstup. Jde o kontrakt tohoto konkrétního API, nikoli o univerzální rozsah všech modelů a providerů. #cite(bib.openai_responses_temperature)] <example-temperature_openai_responses>

[#emph[Praktický význam:] Podporované sampling parametry lze volit podle charakteru úlohy: stabilnější strukturované kroky mohou vyžadovat koncentrovanější výběr, zatímco explorační generování může využít větší variabilitu. Nastavení musí respektovat možnosti konkrétního API.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Kontextové okno (Context Window)] <concept-context_window>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Kontextové okno je konečný rozsah tokenové sekvence, kterou model může mít v daném inferenčním běhu současně k dispozici jako aktivní vstup. #cite(bib.liu2024)
]

O tuto kapacitu se dělí instrukce, historie konverzace, uživatelská data, výsledky nástrojů a další vložený obsah. Nominální maximální délka však popisuje kapacitu vstupu, nikoli záruku, že model využije každou relevantní informaci v dlouhém kontextu stejně spolehlivě. #cite(bib.liu2024)

#block[#strong[Long-context model s nominálním 16K oknem.] Liu et al. mezi testovanými systémy zahrnují LongChat-13B s kontextovým oknem 16K a ukazují, že samotná deklarovaná kapacita neznamená stejně spolehlivé využití informace ve všech pozicích dlouhého vstupu. #cite(bib.liu2024)] <example-context_window_lost_middle>

[#emph[Praktický význam:] Agent nemůže do jednoho inferenčního kroku bez omezení hromadit instrukce, přepis, nástrojové výstupy a další kontext. Musí proto hlídat aktivní tokenový rozpočet a rozhodovat, které informace mají být v konkrétním kroku dostupné.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Mezipaměť klíčů a hodnot (KV Cache)] <concept-kv_cache>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  KV cache je runtime mezipaměť dříve vypočtených klíčů a hodnot pozornostních vrstev pro tokeny již zpracovaného prefixu, které lze znovu použít při autoregresivním dekódování dalších tokenů. #cite(bib.ainslie2023)
]

Opakované použití uložených klíčů a hodnot omezuje potřebu znovu počítat pozornostní reprezentace celého prefixu, ale cache současně spotřebovává paměť a její velikost roste s počtem aktivních tokenů a sekvencí. #cite(bib.kwon2023pagedattention) KV cache je interní runtime mechanismus inference a není totéž co providerové prompt caching, billing cache ani sémantická cache.

#block[#strong[Bloková správa KV cache ve vLLM.] PagedAttention ve vLLM ukládá KV cache do nesouvislých bloků a mapuje logické bloky sekvence na fyzické bloky paměti. Tím řeší proměnlivou velikost cache jednotlivých sekvencí a umožňuje bezpečné sdílení bloků tam, kde je obsah společný. #cite(bib.kwon2023pagedattention)] <example-kv_cache_pagedattention>

[#emph[Praktický význam:] KV cache zrychluje pokračující autoregresivní generování z již zpracovaného prefixu za cenu runtime paměti. Při dlouhých nebo souběžných agentních bězích proto může být správa cache významnou součástí kapacitního plánování inference.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Degradace kontextu (Context Rot)] <concept-context_rot>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Degradace kontextu (Context Rot) označuje praktický pokles spolehlivosti, s níž model dokáže využívat relevantní informace při růstu délky, informačního zatížení nebo nevýhodném umístění informace v aktivním kontextu. #cite(bib.liu2024)
]

Empirické studie dlouhého kontextu ukazují, že schopnost nalézt a využít relevantní údaj není určena pouze tím, zda se údaj vejde do nominálního kontextového okna. Výkon může záviset na jeho poloze a přidání dalšího kontextu proto samo o sobě nezaručuje spolehlivější využití všech vložených informací. #cite(bib.liu2024)

#block[#strong[„Lost in the Middle“.] V experimentu s multi-document question answering i key-value retrieval vykazují testované dlouhokontextové modely výraznou citlivost na polohu relevantní informace: výkon bývá vyšší, když je informace na začátku nebo na konci vstupu, a nižší při jejím umístění uprostřed dlouhého kontextu. #cite(bib.liu2024)] <example-context_rot_lost_middle_pattern>

[#emph[Praktický význam:] Pouhé hromadění celé historie není spolehlivou strategií pro dlouhotrvající agentní běhy. Pozdější vrstvy agentního systému proto potřebují kontext selektivně vybírat, zkracovat nebo jinak spravovat podle aktuálního kroku.]

Modelová inference poskytuje výstup z konečného aktivního kontextu, nikoli kontinuitu dlouhotrvající úlohy ani provedení účinků v externím prostředí. Systém, který má uchovávat stav, používat nástroje a pokračovat napříč více kroky, proto potřebuje další vrstvu: Harness.

#heading(level: 2)[Harness] <section-harness>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Model provádí inferenci nad aktuálním vstupem; Harness je běhová vrstva kolem této inference, která z jednotlivých inferenčních kroků vytváří pokračující agentní běh. Opakuje kroky, zachovává kontinuitu sezení a stavu, zpřístupňuje vnější prostředí a nástroje, provádí vyžádané účinky mimo model, omezuje jejich prostředí a načítá rozšíření. OpenAI Agents SDK například poskytuje vestavěnou agentní smyčku, která zpracovává vyvolání nástrojů a vrací jejich výsledky modelu, a SandboxAgent s pracovním prostorem, shellem, souborovým systémem a obnovitelným stavem sandboxu. #cite(bib.openai_agents_sdk) #cite(bib.openai_agents_sandbox)
]

Harness zde vysvětluje dostupné běhové mechanismy, nikoli metodiku jejich záměrného skládání. Způsob specifikace úlohy, výběr kontextu, revize práce, orchestrace agentů a návrh CI či workflow patří do části 3.1 Agentické inženýrství.

#figure(
  image("img/external/claude-code-interface.png", width: 88%),
  caption: [Terminálové rozhraní Claude Code jako příklad uživatelské vrstvy agentního Harnessu: model je zpřístupněn uvnitř pokračujícího běhu s viditelným stavem práce a nástrojovými interakcemi. Snímek pochází z oficiálního materiálu Anthropic. #cite(bib.anthropic_claude_code_interface)],
) <fig-claude-code-interface>

#figure(
  image("img/external/antigravity-ide-interface.png", width: 88%),
  caption: [Google Antigravity IDE jako příklad integrovaného agentního prostředí: editor, terminál a agentní panel tvoří rozhraní k pracovnímu prostoru, ve kterém může agent pozorovat a měnit software. Snímek pochází z oficiálního Google Codelabu. #cite(bib.google_antigravity_ide)],
) <fig-antigravity-ide-interface>

[#emph[Praktický význam:] Harness převádí jednotlivé modelové inference na stavový agentní runtime, ve kterém mohou rozhodnutí modelu navazovat na skutečné výsledky předchozích akcí a působit v kontrolovaném prostředí.]

#heading(level: 3)[Smyčka a stav] <section-harness_state_loop>
#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Agentní smyčka (Agent Loop)] <concept-agent_loop>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Agentní smyčka je opakovaný běhový cyklus, ve kterém model z aktuálního vstupu vybere další akci nebo ukončení; vybranou externí akci provede Harness prostřednictvím nástroje či prostředí a vzniklé pozorování předá do další inference. #cite(bib.yao2022)
]

Základní mechanismus lze vyjádřit jako *Model → Akce → Nástroj/prostředí → Pozorování → Model*, s volitelnou koncovou větví *Model → Výsledek*. Model tedy rozhoduje o požadované akci, ale externí účinek nevykonává sám. Původní práce ReAct kombinuje uvažování a jednání tak, že akce interagují s vnějšími zdroji a jejich výsledky se stávají pozorováními pro další krok. #cite(bib.yao2022)

#block[#strong[ReAct nad Wikipedií.] V úlohách HotpotQA a FEVER autoři ReAct používají jednoduché rozhraní k Wikipedii: model volí akce pro vyhledání či dohledání externí informace a získané pozorování následně ovlivňuje další inferenční krok. Jde o konkrétní instanci principu akce–pozorování, nikoli o univerzální architekturu všech agentních systémů. #cite(bib.yao2022)] <example-agent_loop_react>

#figure(
  image("img/react-loop.svg", width: 92%),
  caption: [Schéma agentní smyčky inspirované interakcí ReAct: model volí akci, Harness ji předá nástroji nebo prostředí, pozorování výsledku se vrací modelu a cyklus může skončit výsledkem. ReAct je zde zdrojem mechanismu, nikoli tvrzením, že každý agentní systém používá totožnou architekturu. #cite(bib.yao2022)],
) <fig-react-loop>

[#emph[Praktický význam:] Smyčka umožňuje, aby pozdější rozhodnutí vycházela ze skutečně pozorovaných výsledků předchozích akcí místo z jednorázového odhadu modelu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Agentní sezení (Session)] <concept-agent_session>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Agentní sezení je identifikační a kontinuální hranice jednoho pokračujícího běhu nebo konverzace, přes kterou lze propojit více modelových kroků a později na ně navázat. #cite(bib.openai_agents_sessions)
]

Sezení vymezuje, které interakce patří ke stejnému pokračování; samo o sobě není synonymem pro přepis ani pro aktuální provozní stav. OpenAI Agents SDK umožňuje předat implementaci rozhraní `Session` do `Runner.run`; runner před novým tahem načte uložené konverzační položky, po dokončení přidá nové položky a stejné sezení lze použít i při pokračování přerušeného `RunState`. #cite(bib.openai_agents_sessions)

#block[#strong[MemorySession a OpenAIConversationsSession.] Agents SDK uvádí konkrétní implementace `MemorySession` pro lokální vývoj a `OpenAIConversationsSession` pro Conversations API; obě realizují stejnou hranici pokračování přes rozhraní `Session`. #cite(bib.openai_agents_sessions)] <example-agent_session_openai>

[#emph[Praktický význam:] Stabilní hranice sezení umožňuje navázat další tah nebo obnovený běh na správnou posloupnost interakcí bez směšování nezávislých agentních běhů.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Přepis (Transcript)] <concept-transcript>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Přepis je uspořádaný historický záznam toho, co během agentního běhu proběhlo: může obsahovat zprávy, požadavky na nástroje, jejich výsledky a další zaznamenané runtime události. #cite(bib.openai_agents_sessions)
]

Přepis odpovídá na otázku, co se stalo. Je historickým důkazem průběhu, nikoli automaticky reprezentací právě platného pracovního stavu ani totožností s aktivním modelovým kontextem. V OpenAI Agents SDK tvoří historii sezení uložené konverzační položky, které runner načítá v pořadí před dalším tahem a doplňuje po dokončení běhu. #cite(bib.openai_agents_sessions)

#block[#strong[Historie sezení v Agents SDK.] `MemorySession` ukládá konverzační položky v paměti procesu, zatímco jiné implementace stejného rozhraní mohou používat trvalé úložiště. Jde o konkrétní reprezentaci historie, nikoli o tvrzení, že všechny historické události musí být současně aktivním vstupem modelu. #cite(bib.openai_agents_sessions)] <example-transcript_openai_session>

[#emph[Praktický význam:] Přepis poskytuje auditovatelnou stopu pro rekonstrukci běhu, diagnostiku chyb a dohledání toho, které pozorování vedlo k pozdějšímu rozhodnutí.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Stav (State)] <concept-state>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Stav je persistovaná reprezentace aktuálně platných pracovních skutečností a řídicích údajů potřebných k pokračování vykonávání. #cite(bib.openai_agents_run_state)
]

Stav se liší od úplného historického přepisu, od aktivního tokenového kontextu modelu i od skutečného stavu externího prostředí. Může z historie odvozovat jen údaje, které jsou pro další krok stále platné, a může uchovávat řídicí informace, jež se do každého modelového vstupu neposílají. OpenAI Agents SDK popisuje `RunState` jako serializovatelný snímek běhu; sandboxová vrstva může v tomto stavu nést také údaje potřebné k opětovnému připojení k pracovnímu prostředí. #cite(bib.openai_agents_run_state) #cite(bib.openai_agents_sandbox)

#block[#strong[Obnovení RunState.] Přerušený běh Agents SDK lze serializovat a později obnovit místo opakování již provedených kroků; runner tak pokračuje z uložených řídicích údajů a případného navázaného sandboxového stavu. #cite(bib.openai_agents_run_state) #cite(bib.openai_agents_sandbox)] <example-state_openai_runstate>

Hranice těchto tří pojmů je proto: #term(terms.agent_session) určuje kontinuitu běhu, #term(terms.transcript) zachycuje jeho historii a #term(terms.state) uchovává právě platná persistovaná fakta a řídicí údaje.

[#emph[Praktický význam:] Explicitní stav umožňuje obnovit běh podle aktuálně platných údajů bez požadavku, aby celý historický přepis zůstával v modelovém kontextu.]

#heading(level: 3)[Prostředí a nástroje] <section-harness_tools_environment>
#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Prostředí agenta (Agent Environment)] <concept-environment>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Prostředí agenta je vnější svět, který Harness agentovi dovoluje pozorovat nebo měnit, například repozitářové soubory, procesy, shell, souborový systém, síťové služby a výstupy testů či sestavení. #cite(bib.openai_agents_sandbox)
]

Účinky v prostředí existují mimo modelový kontext: změna souboru nebo spuštění procesu není textová inference, ale změna externího stavu, jejíž výsledek musí Harness zprostředkovat zpět jako pozorování. OpenAI Sandbox Agents oddělují definici agenta od živého pracovního prostoru; manifest může nový workspace naplnit repozitářem z GitHubu nebo lokálními soubory a sandboxové schopnosti následně zpřístupní souborový systém a shell. #cite(bib.openai_agents_sandbox)

#block[#strong[Workspace SandboxAgent.] Dokumentace Agents SDK ukazuje agentní workspace inicializovaný repozitářem a následně dostupný přes souborové a shellové schopnosti. Model tak pracuje s reálnými soubory a výstupy procesů, ne s jejich pouhou textovou představou. #cite(bib.openai_agents_sandbox)] <example-environment_openai_sandbox>

[#emph[Praktický význam:] Prostředí poskytuje agentovi skutečný pracovní prostor; Harness přitom určuje, které jeho části a operace jsou agentovi vůbec dostupné.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Nástroje (Tools)] <concept-tools>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Nástroj je externí schopnost nebo programové rozhraní zpřístupněné agentovi, například vyhledávání, čtení souboru, shell, editor nebo API. Nástroj je dostupná schopnost; #term(terms.tool_calling) je mechanismus, kterým model požádá o její konkrétní použití. #cite(bib.openai_agents_tools)
]

Harness modelu popíše dostupné nástroje a po zvoleném vyvolání zajistí jejich provedení v příslušném prostředí. OpenAI Agents SDK rozlišuje hostované nástroje, lokálně prováděné nástroje a funkční nástroje; u vestavěných `shell` a `apply_patch` volání požaduje model, ale práci vykonává nakonfigurované prostředí mimo samotnou modelovou odpověď. #cite(bib.openai_agents_tools)

#block[#strong[Shell a apply_patch.] Agents SDK uvádí shell pro spuštění příkazů a apply_patch pro změnu souborů jako konkrétní výkonné nástroje. Model může jejich použití požadovat, zatímco aplikace či sandbox provede skutečný příkaz nebo editaci. #cite(bib.openai_agents_tools)] <example-tools_openai_execution>

[#emph[Praktický význam:] Nástroje dávají agentovi ověřitelné schopnosti mimo generování textu; jejich rozhraní současně vymezuje, jaké vnější účinky může agent vůbec vyžádat.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Vyvolávání nástrojů (Tool Calling)] <concept-tool_calling>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Vyvolávání nástrojů je modelové a rozhranové propojení, při kterém model vybere deklarovaný nástroj a vytvoří strukturované argumenty pro konkrétní volání. Samotné vyvolání ještě není provedením nástroje. #cite(bib.openai_agents_tools)
]

Harness přijme požadavek modelu, ověří jeho argumenty podle rozhraní, směruje jej na implementaci nástroje, provede operaci mimo model a vrátí výsledek do další inference. OpenAI Agents SDK obaluje lokální funkce jako function tools s JSON Schema a podle schématu jejich argumenty validuje; výchozí agentní smyčka po provedení nástroje vrací jeho výsledek modelu pro další krok. #cite(bib.openai_agents_tools) #cite(bib.openai_agents_sdk)

#block[#strong[Funkční nástroj v Agents SDK.] Quickstart SDK definuje nástroj jako TypeScript funkci se jménem, popisem a schématem Zod; z něj vznikne schéma viditelné modelu a argumenty se před spuštěním funkce validují. #cite(bib.openai_agents_tools)] <example-tool_calling_openai_function>

[#emph[Praktický význam:] Oddělení deklarace nástroje, modelového výběru a skutečného provedení dovoluje Harnessu validovat požadavek a kontrolovat účinky předtím, než se projeví v prostředí.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Spouštění kódu (Code Execution)] <concept-code_execution>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Spouštění kódu je nástrojová nebo runtime schopnost, která skutečně vykoná program či příkaz a vrátí jeho výstup agentovi jako pozorování. #cite(bib.anthropic_code_execution)
]

Pro softwarovou práci tak lze místo predikce výsledku skutečně spustit test, sestavení, skript, formátovač nebo diagnostický příkaz a získat jeho návratový kód, standardní výstup či chybu. Anthropic Code Execution například provádí Bash příkazy a práci se soubory v serverovém sandboxovaném kontejneru a výsledky vrací modelu ve stejném požadavku. #cite(bib.anthropic_code_execution)

#block[#strong[Anthropic Code Execution.] Aktuální rozhraní zpřístupňuje Bash a souborové operace v izolovaném kontejneru; příkaz je vykonán na serveru a model obdrží skutečný výsledek, nikoli odhad toho, co by se při spuštění stalo. #cite(bib.anthropic_code_execution)] <example-code_execution_anthropic>

[#emph[Praktický význam:] Skutečné vykonání zvyšuje epistemickou kvalitu agentní práce: další rozhodnutí může vycházet z reálného výsledku testu nebo příkazu místo z pravděpodobnostního odhadu modelu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Izolované prostředí (Sandbox)] <concept-sandbox>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Sandbox je bezpečnostní a izolační hranice, která omezuje prostředky a účinky kódu či nástrojů spuštěných agentem. Není synonymem pro kontejner ani microVM; ty jsou možné technické prostředky jeho realizace. #cite(bib.openai_agents_sandbox_clients) #cite(bib.agache2020firecracker)
]

Izolace může kombinovat procesovou nebo virtualizační hranici s omezeními souborového systému, sítě a dalších oprávnění. OpenAI Agents SDK tuto hranici odděluje od konkrétního klienta: `UnixLocalSandboxClient` je určen pro důvěryhodný lokální běh bez OS-level izolace, zatímco `DockerSandboxClient` používá kontejnerovou hranici. Firecracker ukazuje jiný implementační prostředek založený na microVM. #cite(bib.openai_agents_sandbox_clients) #cite(bib.agache2020firecracker)

#block[#strong[DockerSandboxClient.] Stejný SandboxAgent lze podle dokumentace Agents SDK spustit nad Docker-backed klientem, když je požadována kontejnerová izolace, nebo nad Unix-local klientem pro důvěryhodný lokální vývoj. Rozdíl ukazuje, že sandbox popisuje bezpečnostní hranici, ne jedinou konkrétní virtualizační technologii. #cite(bib.openai_agents_sandbox_clients)] <example-sandbox_openai_clients>

[#emph[Praktický význam:] Sandbox omezuje blast radius chybného nebo nežádoucího kroku; Harness má agentovi poskytnout pouze souborový systém, síť a další schopnosti, které daná úloha skutečně potřebuje.]

#heading(level: 3)[Rozšíření] <section-harness_extensions>
#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Dovednosti (Skills)] <concept-skills>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Dovednost je znovupoužitelný balíček instrukcí a metadat, který může navíc obsahovat podpůrné skripty, reference a další zdroje pro určitou třídu úloh. #cite(bib.agent_skills_spec)
]

Specifikace Agent Skills používá jako vstupní bod `SKILL.md` s YAML frontmatterem a instrukcemi v Markdownu; doplňující obsah může být uložen například v adresářích `scripts/`, `references/` a `assets/` a načítán až podle potřeby. Skill tím přidává znovupoužitelnou pracovní znalost, nikoli sám o sobě novou externí výkonnou schopnost. #cite(bib.agent_skills_spec)

#block[#strong[Skill s podpůrným skriptem.] Specifikace počítá s tím, že vedle `SKILL.md` může balíček obsahovat deterministický program v `scripts/` a samostatné referenční materiály. Agent tak může nejprve načíst stručná metadata a detailní instrukce nebo podpůrný kód použít až tehdy, když jsou pro úlohu relevantní. #cite(bib.agent_skills_spec)] <example-skills_spec_package>

[#emph[Praktický význam:] Skills umožňují verzovat a znovu používat doménové postupy bez opakovaného kopírování celé instrukce do každého zadání a bez zaměňování instrukčního balíčku za samotný nástroj.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Plugin] <concept-plugins>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Plugin je v platformách, které tento mechanismus definují, distribuovatelný balíček rozšíření. V Claude Code může plugin sdružovat například Skills, agenty, Hooks a konfiguraci MCP serverů; tato podoba je specifická pro Claude Code a není univerzální definicí všech agentních pluginů. #cite(bib.claude_code_plugins)
]

Plugin zde představuje především hranici balení a distribuce. Jednotlivé součásti uvnitř něj si zachovávají vlastní význam: Skill nese instrukce a zdroje, Hook reaguje na událost, MCP popisuje integrační protokol a Tool je konkrétní dostupná schopnost. #cite(bib.claude_code_plugins)

#block[#strong[my-first-plugin.] Oficiální quickstart Claude Code vytváří adresář `my-first-plugin`, manifest `.claude-plugin/plugin.json` a Skill `skills/hello/SKILL.md`; plugin se pro lokální test načte přepínačem `--plugin-dir`. #cite(bib.claude_code_plugins)] <example-plugin_claude_code>

[#emph[Praktický význam:] Plugin umožňuje distribuovat související rozšíření jako jednu verzovatelnou jednotku, aniž by se jejich jednotlivé mechanismy slévaly do jednoho obecného pojmu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Skript] <concept-scripts>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Skript je spustitelná deterministická programová logika používaná rozšířením nebo workflow k přesnému a opakovatelnému provedení operace.
]

Na rozdíl od nového modelového kroku provádí skript předem definovaný program. Agent Skills specifikace dovoluje balíčku Skill obsahovat podpůrné spustitelné soubory v `scripts/`; Claude Code plugin může obdobně obsahovat `bin/` s executable soubory zpřístupněnými Bash nástroji po dobu aktivace pluginu. #cite(bib.agent_skills_spec) #cite(bib.claude_code_plugins)

#block[#strong[Podpůrný program ve Skill.] Adresář `scripts/` podle Agent Skills odděluje spustitelnou implementaci od textových instrukcí `SKILL.md`; totéž rozšíření tak může modelu popsat postup a přesný dílčí krok provést deterministickým kódem. #cite(bib.agent_skills_spec)] <example-script_agent_skill>

[#emph[Praktický význam:] Jestliže má být krok přesný a opakovatelný, vykonání skriptu je vhodnější než požadovat po modelu, aby stejnou mechanickou transformaci pokaždé znovu generoval.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Hooks] <concept-hooks>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Hooks jsou v platformách s událostním rozhraním konfigurované reakce spuštěné při konkrétních událostech životního cyklu. V Claude Code mohou takové reakce spustit deterministický příkaz, HTTP požadavek nebo jinou podporovanou akci nezávisle na tom, zda se model sám rozhodne tuto kontrolu provést. #cite(bib.claude_code_hooks)
]

Událost `PreToolUse` nastává po vytvoření argumentů nástroje, ale před jeho zpracováním, takže Hook může použití povolit, odmítnout nebo vyžádat potvrzení; `PostToolUse` nastává po úspěšném provedení nástroje. Jde o konkrétní lifecycle Claude Code, nikoli o tvrzení, že všechny agentní platformy používají stejné názvy událostí. #cite(bib.claude_code_hooks)

#block[#strong[Lint po změně souboru.] Dokumentace Claude Code uvádí `PostToolUse` Hook s matcherem pro nástroje `Write|Edit`, který po změně souboru spustí lintovací příkaz. Kontrola se váže na událost runtime, takže její spuštění nemusí model plánovat jako další krok. #cite(bib.claude_code_hooks)] <example-hooks_claude_lint>

[#emph[Praktický význam:] Hooks umožňují automaticky připojit povinnou reakci nebo kontrolu ke konkrétní runtime události a oddělit ji od pravděpodobnostního rozhodování modelu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[MCP] <concept-mcp>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Model Context Protocol (MCP) je otevřený protokol pro standardizované propojení AI hostitelů a klientů se servery, které zpřístupňují schopnosti a data. Aktuální specifikace 2026-07-28 definuje hranici mezi hostitelem, klienty a MCP servery; nejde o synonymum pro Tool, Tool Calling ani Plugin. #cite(bib.mcp_spec_2026)
]

Server může přes MCP publikovat například nástroje, resources nebo prompts. Protokol standardizuje jejich objevování a vyvolávání přes klientskou hranici, zatímco konkrétní modelový Tool Calling zůstává mechanismem hostitele a Plugin zůstává případným distribučním obalem platformy. #cite(bib.mcp_spec_2026) #cite(bib.mcp_tools_2026)

#block[#strong[Oficiální weather server.] TypeScript SDK pro MCP ukazuje server, který registruje nástroj `get-alerts` pro aktivní výstrahy americké National Weather Service. Klient si nástroj vypíše a zavolá jej se strukturovaným argumentem státu; SDK argument ověří proti schématu a vrátí výsledek přes protokol. #cite(bib.mcp_ts_first_server)] <example-mcp_weather_server>

[#emph[Praktický význam:] MCP umožňuje připojit stejnou serverovou integraci k různým kompatibilním hostitelům bez toho, aby se samotný protokol zaměňoval za konkrétní nástroj nebo rozhodnutí modelu tento nástroj použít.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[.agents/] <concept-agents_directory>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  `.agents/` je v aktuálním Codexu jmenný prostor pro agentní přizpůsobení, zejména repozitářové Skills; nejde o umístění souboru AGENTS.md. #cite(bib.openai_customization_overview)
]

Codex hledá repozitářové Skills v `.agents/skills` v cestě projektu a uživatelské Skills v `~/.agents/skills`. Naproti tomu AGENTS.md je samostatný mechanismus instrukcí hledaný v adresářové hierarchii repozitáře. #cite(bib.openai_customization_overview) #cite(bib.openai_agents_md)

#block[#strong[Repozitářový Skill.] Umístění `.agents/skills/review/SKILL.md` drží Skill přímo v repozitářovém prostoru Codexu, zatímco kořenový `AGENTS.md` zůstává samostatným souborem instrukcí pro příslušnou část stromu. #cite(bib.openai_customization_overview) #cite(bib.openai_agents_md)] <example-agents_directory_codex>

[#emph[Praktický význam:] `.agents/` umožňuje verzovat znovupoužitelná agentní rozšíření spolu s projektem, aniž by se jejich umístění zaměnilo s hierarchickými instrukcemi AGENTS.md.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[.claude/] <concept-claude_directory>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  `.claude/` je projektový nebo uživatelský jmenný prostor Claude Code, ve kterém vedle sebe existuje několik odlišných konfiguračních mechanismů; adresář sám proto není jedním univerzálním typem rozšíření. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)
]

Projekt může používat `.claude/CLAUDE.md` pro trvalé instrukce, `.claude/rules/` pro modulární pravidla a `.claude/settings.json` pro sdílená nastavení. Standalone Skills, agenti a Hooks mohou rovněž používat struktury pod `.claude/`, zatímco distribuovatelný Plugin má vlastní kořen a případný manifest `.claude-plugin/plugin.json`. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings) #cite(bib.claude_code_plugins)

#block[#strong[Oddělené projektové soubory.] Dokumentace Claude Code ukazuje projekt s `.claude/CLAUDE.md`, samostatnými soubory v `.claude/rules/` a projektovým `.claude/settings.json`; každá cesta má jinou úlohu a vlastní precedence pravidla. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)] <example-claude_directory_structure>

[#emph[Praktický význam:] `.claude/` umožňuje verzovat projektové instrukce, pravidla, nastavení a standalone rozšíření blízko repozitáře, přičemž jejich význam zůstává explicitně oddělen.]

Modelová inference poskytuje rozhodnutí nebo výstup pro aktuální krok. Harness k ní přidává kontinuitu, skutečné účinky v externím prostředí a rozšiřitelné běhové rozhraní; společně tím vzniká agentní runtime. Záměrný návrh zadání, kontextu, ověřování a orchestrace tohoto runtime je tématem následující Praktické části.

#heading(level: 1)[Praktická část] <section-practical>
Praktická část převádí teoretické mechanismy do způsobu práce se softwarem. Část 3.1 popisuje a zdůvodňuje postupy Agentického inženýrství; část 3.2 je vyhrazena jejich konkrétní realizaci v systému DarkFactory.

#heading(level: 2)[Agentické inženýrství] <section-agentic_engineering>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Agentické inženýrství je softwarově-inženýrský způsob práce, který obaluje pravděpodobnostní rozhodování agenta explicitními artefakty, izolací změny, řízeným kontextem a ověřitelnými kontrolními body. Nezavádí nový běhový mechanismus vedle Harnessu; určuje, jak se mechanismy vysvětlené v části 2.2 skládají do kontrolovatelného vývojového procesu. #cite(bib.anthropic_context_engineering) #cite(bib.anthropic2024tooluse)
]

Praktický postup v této kapitole sleduje jednu návaznost: nejprve vznikne explicitní zadání a plán, změna se provádí v izolované a dohledatelné historii, instrukce a kontext se dávkují podle aktuálního kroku, provedení je omezeno deterministickými pravidly, výsledek prochází objektivním ověřením a revizí a teprve tam, kde to rozsah úlohy odůvodňuje, se práce rozděluje mezi více agentů. Jednotlivé pojmy níže proto nejsou samostatnými slovníkovými položkami, ale stavebními prvky této metodiky.

[#emph[Praktický význam:] Schopný model ani Harness samy neurčují, co má být přijato jako správná změna. Agentické inženýrství převádí cíl člověka na sled artefaktů, omezení a důkazů, podle nichž lze práci řídit a zkontrolovat.]

#heading(level: 3)[Zadání a způsob práce] <section-ai_assisted_specification>
Dobrá agentní změna začíná dříve než editací kódu. Zadání musí oddělit požadovaný výsledek od předpokládané implementace, uvést omezení a ne-cíle a popsat, podle čeho bude dokončení poznatelné. Z takového zadání lze vytvořit plán a později provést revizi proti stejnému referenčnímu bodu místo hodnocení podle toho, zda výstup pouze působí dokončeně.

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Vývoj řízený specifikací (Spec-Driven Development)] <concept-spec_driven_development>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Vývoj řízený specifikací je postup, ve kterém se požadované chování, omezení a akceptační podmínky zachytí jako explicitní specifikace dříve, než začne implementace, a tato specifikace zůstává referenčním bodem pro plánování i ověření.
]

Mechanismus odděluje otázku „co má systém dělat“ od otázky „jak to bude implementováno“. Aktuální GitHub Spec Kit tento postup realizuje příkazy pro vytvoření specifikace, implementačního plánu a seznamu úloh; po implementaci přidává fázi convergence, která kontroluje soulad implementace se specifikací a plánem a vrací zjištěné odchylky k opravě. #cite(bib.github_spec_kit)

#block[#strong[GitHub Spec Kit.] Referenční workflow GitHubu vede úlohu přes `specify → plan → tasks → implement → converge`; před implementací lze vložit také clarification a checklist kroky. Specifikace je tedy verzovaný vstup pro další rozhodování, ne jednorázový prompt, který po zahájení práce ztratí význam. #cite(bib.github_spec_kit)] <example-spec_driven_development_spec_kit>

[#emph[Praktický význam:] Specifikace má obsahovat takové podmínky, které lze při revizi nebo automatické kontrole znovu použít. Čím více důležitých požadavků zůstane pouze implicitních, tím více se přijetí změny opírá o úsudek modelu namísto dohledatelného kontraktu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Plánování (Planning)] <concept-planning>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Plánování převádí specifikaci na pořadí kroků, závislosti, hranice změny a způsob ověření tak, aby bylo před provedením zřejmé, co se má měnit a jak budou výsledky jednotlivých kroků posouzeny. #cite(bib.sommerville2016)
]

U agentní práce je plán současně řídicím artefaktem: dovoluje porovnávat průběh s očekávaným stavem a zmenšuje potřebu znovu odvozovat původní záměr z dlouhého přepisu. GitHub Spec Kit například odvozuje technický plan a následné tasks ze schválené specifikace, takže implementační kroky zachovávají vazbu na původní požadavek. #cite(bib.github_spec_kit)

#block[#strong[Plán před implementací.] V Agentic SDD workflow Spec Kitu vzniká technický plán před rozkladem na úlohy a před implementací; následující analýza může ještě před editací odhalit nekonzistenci mezi specifikací, plánem a úlohami. #cite(bib.github_spec_kit)] <example-planning_spec_kit>

[#emph[Praktický význam:] Plán má být dostatečně konkrétní pro kontrolu postupu, ale nemá zbytečně předepisovat implementační detail, který lze bezpečně rozhodnout až podle skutečného stavu repozitáře.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Revize (Review)] <concept-review>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Revize je oddělené posouzení navržené změny proti specifikaci, diffu, výsledkům kontrol a dalším explicitním kritériím před jejím přijetím.
]

GitHub Pull Request review poskytuje pro tuto hranici konkrétní stavový mechanismus: reviewer může změny komentovat, schválit nebo vyžádat další úpravy. Revize proto není opakováním implementace stejným agentem, ale novým kontrolním krokem nad vzniklým artefaktem a dostupnými důkazy. #cite(bib.github_pull_request_reviews)

#block[#strong[Request changes.] GitHub rozlišuje review výsledky Comment, Approve a Request changes; poslední z nich může při odpovídající branch protection zabránit sloučení, dokud není požadovaná revize vyřešena. #cite(bib.github_pull_request_reviews)] <example-review_github_pr>

[#emph[Praktický význam:] Revize má porovnávat konkrétní změnu s původním zadáním a výsledky ověření. Nález se vrací jako nový vstup do opravy; „vypadá to správně“ není náhradou za akceptační podmínku.]

Specifikace, plán a revizní kritéria společně určují, co má agent změnit. Dalším krokem je zajistit, aby samotné provedení zůstalo izolované a dohledatelné.

#heading(level: 3)[Řízení změny] <section-ai_assisted_change_control>
Agent má pracovat nad skutečným stavem repozitáře, ale jeho rozpracovaný výsledek nemá nekontrolovaně přepisovat integrační větev. Správa verzí proto vytváří auditní stopu, větev izoluje práci a Pull Request tvoří explicitní hranici, na kterou lze navázat revizi a automatické kontroly.

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Správa verzí (Version Control)] <concept-version_control>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Správa verzí zaznamenává historii změn jako identifikovatelné revize, které lze porovnávat, spojovat a v případě potřeby vracet. #cite(bib.chacon2014)
]

Pro agentní workflow je důležité, že pracovní výsledek lze ukotvit ke konkrétnímu commitu a odlišit jej od pozdějších změn jiného aktéra. Diff pak poskytuje přesný rozsah toho, co má revize a automatické ověření posoudit, místo aby se hodnotil neurčitý aktuální stav pracovního adresáře. #cite(bib.chacon2014)

#block[#strong[Commit jako kontrolní bod.] Git ukládá commit jako snímek projektu s vazbou na rodičovský commit; historii tak lze procházet a dvě revize přímo porovnat. #cite(bib.chacon2014)] <example-version_control_git_commit>

[#emph[Praktický význam:] Agentní změna má být dohledatelná ke konkrétním commitům. To umožňuje reprodukovat, která verze byla testována, a oddělit vlastní výsledek od souběžných změn v repozitáři.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Větev (Branch)] <concept-branch>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Větev je pojmenovaná linie vývoje ukazující na vlastní posloupnost commitů a umožňující provádět změnu mimo cílovou integrační větev. #cite(bib.chacon2014) #cite(bib.github_branches)
]

Izolace však není jednorázový stav. Pokud cílová větev během práce postoupí, musí být před integrací znovu porovnán základ změny a případné konflikty vyřešeny podle významu obou úprav. GitHub dokumentuje větve jako oddělené linie práce, které lze před sloučením aktualizovat vůči cílové větvi. #cite(bib.github_branches)

#block[#strong[Feature branch.] Běžný Git workflow vytváří pro izolovanou práci samostatnou větev a její commity později slučuje s cílovou historií; paralelní práce tak nemusí sdílet jednu rozpracovanou linii. #cite(bib.chacon2014)] <example-branch_git_feature>

[#emph[Praktický význam:] Agent má měnit čerstvou izolovanou větev a před integrací zkontrolovat, zda se cílová větev nezměnila v jeho vlastněném rozsahu. Konflikt je změna významu, ne pouze textová překážka k automatickému přepsání.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Pull Request] <concept-pull_request>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Pull Request je návrh na integraci změn mezi větvemi, který zpřístupňuje diff, diskusi, review a stav automatických kontrol před sloučením. #cite(bib.github_pull_requests)
]

Tím vzniká jednotná integrační hranice: stejná navržená revize je viditelná člověku, reviewerovi i CI. Pokud se branch head změní, automatické kontroly se vztahují k nové revizi a přijetí se musí opírat o důkazy odpovídající aktuálnímu headu, nikoli o starší úspěšný běh. #cite(bib.github_required_status_checks)

#block[#strong[GitHub Pull Request.] GitHub zobrazuje změny mezi head a base větví a spojuje je s review a status checks; chráněná větev může vyžadovat úspěšné kontroly před merge. #cite(bib.github_pull_requests) #cite(bib.github_required_status_checks)] <example-pull_request_github>

[#emph[Praktický význam:] Pull Request je vhodné místo pro integrační rozhodnutí, protože propojuje přesný diff s revizí a strojovými důkazy. Agent nemá obcházet tuto hranici pouze proto, aby získal zelený stav cílové větve.]

Izolovaná a verzovaná změna je teprve kandidát k přijetí. O tom, zda splňuje požadavky, musí rozhodovat ověření nad konkrétní revizí.

#heading(level: 3)[Kvalita a ověřování] <section-ai_assisted_quality_verification>
Modelový výstup je návrh, nikoli důkaz správnosti. Akceptační podmínky ze specifikace se proto převádějí do objektivních quality gates všude, kde je lze vyhodnotit deterministicky: typicky sestavení, statická analýza, testy, kontroly formátu, generování artefaktů nebo ověření invariantu. Výsledek kontroly se vrací do další opravy a teprve úspěšná revize stejného commitu může být kandidátem na integraci.

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Slop] <concept-slop>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Slop je neformální označení pro nekvalitní digitální obsah, zvláště masově vytvářený pomocí generativní AI; termín nepopisuje technickou kategorii vady ani měřitelnou úroveň kvality. #cite(bib.cambridge2026aislop)
]

V softwarovém workflow je proto užitečnější převést obavu z nekvalitního generovaného výstupu na konkrétní selhání: nesplněnou specifikaci, chybějící test, regresi, neprocházející build nebo nepřijatelný diff. Takový problém lze reprodukovat a vrátit k opravě, zatímco obecný dojem „slopu“ neposkytuje agentovi jednoznačnou podmínku dalšího kroku.

[#emph[Praktický význam:] Neurčité hodnocení kvality má být nahrazeno explicitním kritériem, kdykoli je to možné. Tím se kontrola přesouvá od dojmu z výstupu k reprodukovatelnému důkazu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Průběžná integrace (CI)] <concept-continuous_integration>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Průběžná integrace automaticky sestavuje a ověřuje průběžně vznikající změny tak, aby integrační problémy a regrese byly odhaleny před jejich hromaděním. #cite(bib.humble2010)
]

CI je pro agentní práci externí hodnotitel: příkazy, prostředí a akceptační podmínky jsou definovány mimo modelový úsudek a stejná kontrola se opakuje nad každou relevantní revizí. GitHub required status checks mohou spojit tento výsledek přímo s merge politikou a vyžadovat úspěšný check na aktuálním commitu Pull Requestu. #cite(bib.github_required_status_checks)

#block[#strong[Required status check.] GitHub při chráněné větvi blokuje merge, pokud požadovaná kontrola nemá úspěšný stav pro příslušný head commit; starší zelený běh tedy nenahrazuje ověření novější změny. #cite(bib.github_required_status_checks)] <example-ci_github_required_check>

[#emph[Praktický význam:] Quality gate, která má být povinná, musí být vynucena workflow nebo merge politikou, nikoli pouze uvedena v promptu. Agent může selhání diagnostikovat a opravit, ale nemá sám prohlásit neúspěšnou kontrolu za splněnou.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Integrační test (Integration Test)] <concept-integration_test>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Integrační test ověřuje spolupráci více komponent nebo vrstev přes jejich rozhraní a hledá chyby, které izolovaný test jediné jednotky nemusí odhalit. #cite(bib.sommerville2016)
]

Jeho role v agentním workflow nastává po lokálních kontrolách jednotlivých změněných částí: například může ověřit, zda změna aplikační vrstvy stále spolupracuje s persistencí a veřejným rozhraním jako jeden celek. Taková zkouška musí používat konkrétní vstup a očekávaný výsledek; samotné tvrzení agenta, že rozhraní „by měla být kompatibilní“, integračním testem není. #cite(bib.sommerville2016)

#block[#strong[Ověření rozhraní.] Sommerville popisuje integration testing jako fázi, ve které jsou samostatně vyvinuté komponenty spojovány a testovány se zaměřením na interakce a rozhraní mezi nimi. #cite(bib.sommerville2016)] <example-integration_test_interfaces>

[#emph[Praktický význam:] Testovací pyramida agentní změny má obsahovat kontrolu na nejnižší vrstvě, která může dané riziko skutečně odhalit. Jestliže požadavek závisí na interakci komponent, nestačí pouze unit test jedné z nich.]

Objektivní gate určuje, zda je změna technicky přijatelná; revize navíc ověřuje, zda je to skutečně změna, která byla požadována. Aby agent dokázal obě podmínky plnit i v delším běhu, musí dostávat správné instrukce a správný kontext ve správný okamžik.

#heading(level: 3)[Instrukce a kontext] <section-agentic_context_instructions>
Instrukční a kontextová vrstva má tři časové horizonty. Stabilní pravidla patří do systémových nebo repozitářových instrukcí, konkrétní úloha do specifikace a pracovního promptu a proměnlivá fakta se načítají až podle potřeby. Smíchání všech tří vrstev do stále rostoucího promptu zvyšuje nároky na aktivní kontext a zhoršuje rozlišení mezi autoritativní instrukcí a pouhými daty. #cite(bib.anthropic_context_engineering)

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Promptové inženýrství (Prompt Engineering)] <concept-prompt_engineering>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Promptové inženýrství je systematický návrh instrukcí, příkladů a struktury vstupu s cílem zvýšit pravděpodobnost požadovaného chování modelu. #cite(bib.anthropic_prompt)
]

U agentní úlohy má prompt především zpřesnit cíl, výstupní formát, omezení a dostupné rozhodovací informace. Instrukce však zůstává vstupem pravděpodobnostního modelu; pravidlo, které systém musí vynutit bez ohledu na modelovou odpověď, proto patří do deterministické kontroly popsané v části 3.1.5.

#block[#strong[Strukturované instrukce.] Anthropic doporučuje před pokročilými promptovými technikami jasně formulovat kritéria úspěchu a způsob jejich empirického ověření; prompt je pak jednou z optimalizovaných částí systému, nikoli náhradou evaluace. #cite(bib.anthropic_prompt)] <example-prompt_engineering_anthropic>

[#emph[Praktický význam:] Prompt má modelu vysvětlit úlohu, ne suplovat oprávnění, testovací infrastrukturu nebo stav workflow. Čím důležitější je pravidlo pro bezpečnost či integritu změny, tím méně má jeho vynucení záviset pouze na formulaci instrukce.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Systémový prompt (System Prompt)] <concept-system_prompt>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Systémový prompt je stabilní instrukční vrstva, která nastavuje roli, obecná pravidla a výchozí způsob chování modelu nebo agenta v rámci podporovaného rozhraní. #cite(bib.anthropic_prompt)
]

Patří sem pravidla společná více úlohám, nikoli proměnlivý obsah konkrétního repozitáře nebo aktuální výstup nástroje. Přesun stabilního pravidla do systémové vrstvy snižuje potřebu opakovat jej v každém zadání, ale nezmění jej v technickou autorizační hranici.

#block[#strong[Oddělení instrukční vrstvy.] Dokumentace prompt engineeringu Anthropic pracuje s explicitní rolí a instrukční strukturou jako s prostředkem řízení modelového chování; účinek je stále součástí modelové inference. #cite(bib.anthropic_prompt)] <example-system_prompt_instruction_layer>

[#emph[Praktický význam:] Do systémových instrukcí patří dlouhodobé zásady společné běhům. Projektová pravidla je vhodnější verzovat spolu s repozitářem a aktuální fakta načítat až podle potřeby.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[AGENTS.md] <concept-agents_md>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  AGENTS.md je projektový instrukční mechanismus Codexu, kterým lze verzovat trvalé pokyny vztahující se k repozitáři nebo jeho podstromu. #cite(bib.openai_agents_md)
]

Codex skládá použitelné AGENTS.md instrukce od kořene repozitáře směrem k aktuálnímu pracovnímu adresáři; bližší soubor má vyšší prioritu a `AGENTS.override.md` může pravidlo na konkrétní úrovni nahradit. Tím lze držet globální pravidla u kořene a specializovat je pouze tam, kde je to potřeba. #cite(bib.openai_agents_md)

#block[#strong[Hierarchické instrukce Codexu.] Kořenový AGENTS.md může stanovit společné build a review příkazy a další AGENTS.md v podadresáři doplnit pravidla pro konkrétní část projektu; Codex je při práci v daném podstromu skládá podle dokumentované precedence. #cite(bib.openai_agents_md)] <example-agents_md_codex_hierarchy>

[#emph[Praktický význam:] AGENTS.md má nést Codex-specific repozitářová pravidla, která mají přežít jednotlivý prompt. Nemá být zaměněn s adresářem `.agents/`, který Theory vlastní jako samostatný rozšiřovací mechanismus.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[CLAUDE.md] <concept-claude_md>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  CLAUDE.md je persistentní instrukční mechanismus Claude Code pro projektový nebo uživatelský kontext; jde o mechanismus odlišný od Codex AGENTS.md. #cite(bib.claude_code_memory)
]

Claude Code může načíst projektové instrukce z `./CLAUDE.md` nebo `./.claude/CLAUDE.md`, uživatelské z `~/.claude/CLAUDE.md` a další pravidla podle dokumentované adresářové hierarchie. Projekt tedy může držet instrukce přímo u kódu, aniž by se jejich formát nebo precedence vydávaly za univerzální standard pro všechny agenty. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)

#block[#strong[Projektová paměť Claude Code.] Dokumentace Claude Code odděluje CLAUDE.md a `.claude/rules/` od nastavení v `.claude/settings.json`; instrukce a runtime konfigurace tak zůstávají rozdílnými vrstvami projektu. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)] <example-claude_md_project_instructions>

[#emph[Praktický význam:] AGENTS.md a CLAUDE.md plní podobnou metodickou potřebu — verzovat persistentní repozitářové instrukce — ale mají odlišné vlastníky, vyhledávání i precedence pravidla a nemají se slévat do jednoho fiktivního „agent instruction file“ standardu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Kontextové inženýrství (Context Engineering)] <concept-context_engineering>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Kontextové inženýrství je záměrný výběr, strukturování a obměna informací, které mají být modelu dostupné pro právě prováděný krok. #cite(bib.anthropic_context_engineering)
]

Metodika vychází z vlastností kontextového okna a degradace dlouhého kontextu vysvětlených v části 2.1, aniž by je znovu definovala. Praktické rozhodnutí spočívá v tom, zda má být informace stabilní instrukcí, právě načteným stavem, výsledkem nástroje, vyhledaným dokumentem nebo historií, kterou lze z aktivního vstupu odstranit. Anthropic doporučuje u dlouhotrvajících agentů držet kontext co nejmenší a načítat další informace just-in-time podle potřeby. #cite(bib.anthropic_context_engineering)

#block[#strong[Just-in-time retrieval.] Anthropic popisuje strategii, kdy agent místo přednačtení všech dostupných dat uchovává lehké reference a detailní obsah vyhledá nástrojem až při vzniku potřeby. #cite(bib.anthropic_context_engineering)] <example-context_engineering_anthropic_jit>

[#emph[Praktický význam:] Kontext má být sestaven pro aktuální rozhodnutí, ne jako archiv všeho, co se během běhu stalo. Trvalý stav a přepis proto zůstávají mimo aktivní vstup a vybírají se z nich jen relevantní části.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Vkládání kontextu (Context Injection)] <concept-context_injection>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Vkládání kontextu je just-in-time postup, při kterém Harness doplní do aktivního vstupu informaci až ve chvíli, kdy je relevantní pro aktuální rozhodnutí. #cite(bib.anthropic_context_engineering)
]

Zdrojem může být aktuální stav workflow, soubor načtený z repozitáře, výsledek nástroje nebo jiná externí informace. Mechanismus snižuje potřebu držet celý pracovní svět v každém modelovém kroku a současně umožňuje před vložením zkontrolovat původ a důvěryhodnost dat. #cite(bib.anthropic_context_engineering)

#block[#strong[Načtení podle potřeby.] Místo vložení celé dokumentace do počátečního promptu může agent nejprve dostat index nebo cestu a konkrétní soubor načíst až tehdy, když jej plánovaný krok potřebuje; Anthropic tento přístup uvádí jako just-in-time context retrieval. #cite(bib.anthropic_context_engineering)] <example-context_injection_jit>

[#emph[Praktický význam:] Vkládání kontextu má být řízeno potřebou konkrétního kroku. Zkracuje vstup, ale vyžaduje evidovat, odkud vložená informace pochází a zda se může chovat jako nedůvěryhodný obsah.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Kompakce kontextu (Context Compaction)] <concept-compaction>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Kompakce kontextu nahrazuje část aktivní historie kratší reprezentací, která zachová informace nutné pro pokračování a uvolní kapacitu pro další práci. #cite(bib.anthropic_context_engineering)
]

Kompakce může používat shrnutí, výběr relevantních položek nebo specializovanou kompresi; vždy však představuje informační ztrátu, kterou je potřeba řídit. LLMLingua například komprimuje prompt výběrem tokenů s cílem snížit vstupní náklady při zachování výkonu na testovaných úlohách, což dokládá mechanismus komprese, nikoli univerzální záruku bezztrátového pokračování agentní práce. #cite(bib.jiang2023llmlingua)

#block[#strong[Shrnutí před pokračováním.] Anthropic doporučuje při dlouhých agentních bězích průběžně shrnovat nebo jinak komprimovat starší kontext a zachovat přitom architektonická rozhodnutí, nevyřešené chyby a další údaje důležité pro další krok. #cite(bib.anthropic_context_engineering)] <example-context_compaction_anthropic>

[#emph[Praktický význam:] Před kompakcí je vhodné uložit kritická fakta do explicitního stavu nebo artefaktu. Shrnutí pak může z aktivního vstupu odstranit detail, aniž by se jediná kopie důležité informace ztratila spolu s historií.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[RAG] <concept-rag>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Retrieval-Augmented Generation (RAG) kombinuje generování s vyhledáním relevantních položek z externího korpusu, které jsou před vytvořením odpovědi přidány k modelovému vstupu. #cite(bib.lewis2020rag)
]

Původní práce RAG odděluje parametrickou znalost modelu od neparametrické externí paměti reprezentované vyhledávaným korpusem. V agentním softwarovém workflow lze stejný princip použít pro dokumentaci nebo jiné rozsáhlé zdroje, ale relevance retrievalu stále musí odpovídat konkrétnímu kroku a nalezený text zůstává vstupem, jehož důvěryhodnost je nutné posoudit. #cite(bib.lewis2020rag)

#block[#strong[Původní RAG.] Lewis et al. propojují sekvenční generátor s retrieverem nad externím indexem Wikipedie a ukazují retrieval jako samostatný zdroj podkladů pro generování. #cite(bib.lewis2020rag)] <example-rag_original>

[#emph[Praktický význam:] RAG je jedním z mechanismů výběru just-in-time kontextu. Nemá sloužit k bezvýběrovému vložení všech nalezených dokumentů a samotné nalezení textu mu nedává instrukční autoritu.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Prompt Injection] <concept-prompt_injection>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Prompt Injection je útok nebo manipulační vzor, při kterém instrukce obsažená v uživatelském či externím obsahu ovlivní model tak, aby se odchýlil od zamýšlených instrukcí systému. #cite(bib.owasp_llm01_prompt_injection)
]

Riziko přímo souvisí s context injection a RAG: dokument, webová stránka, e-mail nebo soubor repozitáře může obsahovat nepřímou instrukci, přestože měl být zpracován pouze jako data. OWASP proto rozlišuje direct a indirect prompt injection a OpenAI zdůrazňuje, že důsledky závisí na tom, k jakým datům a akcím má agent přístup. #cite(bib.owasp_prompt_injection) #cite(bib.openai_prompt_injection)

#block[#strong[Nedůvěryhodný dokument.] OWASP uvádí nepřímou injection v externím obsahu jako dokument nebo webovou stránku s vloženou instrukcí. Pokud takový obsah agent načte do kontextu, model může instrukci zaměnit za legitimní pokyn; ochrana proto nemůže stát jen na formulaci systémového promptu. #cite(bib.owasp_prompt_injection)] <example-prompt_injection_indirect>

[#emph[Praktický význam:] Externí text se má považovat za nedůvěryhodná data, oddělovat od autoritativních instrukcí a kombinovat s minimálními oprávněními, validací akcí a případným lidským schválením.]

Řízený kontext zvyšuje kvalitu rozhodnutí, ale stále nezaručuje, že model zvolí povolenou nebo účelnou akci. Další vrstva proto odděluje pravděpodobnostní rozhodování od pravidel, která musí být vynucena deterministicky.

#heading(level: 3)[Řízení agentního chování] <section-agentic_behavior_control>
Agentní autonomie má mít explicitní podmínku pokračování a ukončení, limity prostředků a hranice akcí. Model může rozhodovat uvnitř tohoto prostoru, zatímco Harness nebo workflow kontroluje, zda krok splňuje programově vyhodnotitelné podmínky a zda není nutný zásah člověka.

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Cílené smyčky (Goal Loops)] <concept-goal_loops>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Cílená smyčka opakuje plánování, provedení a vyhodnocení vůči explicitnímu cíli, dokud není splněna podmínka dokončení nebo některý z předem stanovených limitů.
]

Rozdíl oproti běhové Agent Loop z Theory spočívá v řídicí podmínce vyšší úrovně: nestačí, že model vytvořil další akci; workflow vyhodnocuje, zda se přiblížilo k cíli a zda smí pokračovat. Microsoft Agent Framework například umožňuje opakovaně volat agenta přes `LoopAgent`, nastavit maximum iterací a přidat vlastní evaluator rozhodující o dokončení. #cite(bib.microsoft_agent_looping)

#block[#strong[Ohraničený LoopAgent.] Dokumentace Microsoft Agent Framework ukazuje loop s `max_iterations` a volitelnou completion condition; smyčka tedy může být autonomní v jednotlivých iteracích, ale má vnější ukončovací hranici. #cite(bib.microsoft_agent_looping)] <example-goal_loop_microsoft>

[#emph[Praktický význam:] Každá autonomní smyčka má mít měřitelný cíl a alespoň jeden nezávislý stop mechanismus, například limit iterací, času nebo rozpočtu. Jinak se neúspěch může změnit v neomezené opakování stejné strategie.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Guardrail] <concept-guardrail>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Guardrail je programově vyhodnocovaná kontrolní hranice, která může před pokračováním validovat nebo odmítnout vstup, výstup či požadovanou akci. #cite(bib.openai_agents_guardrails)
]

Jeho účel se liší od promptu: modelu pravidlo nevysvětluje pouze jako požadované chování, ale okolní systém rozhodne, zda konkrétní stav splňuje kontrolní podmínku. OpenAI Agents SDK například podporuje input a output guardrails, které mohou při splnění tripwire podmínky běh ukončit. #cite(bib.openai_agents_guardrails)

#block[#strong[Tripwire v Agents SDK.] Guardrail může vrátit `tripwireTriggered`; runner pak vyvolá odpovídající výjimku a běh nepokračuje běžnou cestou. Rozhodnutí o zastavení je tak součástí runtime řízení, ne dalšího požadavku na poslušnost modelu. #cite(bib.openai_agents_guardrails)] <example-guardrail_openai_tripwire>

[#emph[Praktický význam:] Vynutitelná pravidla — například zakázaný rozsah souborů, schéma výstupu nebo povinný test — mají být implementována jako deterministická kontrola tam, kde to systém umožňuje.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Člověk ve smyčce (HITL)] <concept-human_in_the_loop>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Člověk ve smyčce je schvalovací nebo rozhodovací bod, ve kterém automatizované provádění čeká na explicitní lidský vstup před pokračováním.
]

Aktuální OpenAI Agents SDK realizuje tento vzor u nástrojů vyžadujících approval: běh se při takovém požadavku přeruší, vrátí seznam interruptions a po schválení nebo odmítnutí lze pokračovat ze stejného `RunState`. Stejný mechanismus se vztahuje i na schvalované akce vzniklé v nested agentu nebo po handoffu. #cite(bib.openai_agents_hitl)

#block[#strong[Schválení nástroje.] Funkční nástroj s `needsApproval` zastaví Agents SDK před provedením účinku; aplikace rozhodnutí zapíše do uloženého stavu a runner následně pokračuje bez opakování celého běhu od začátku. #cite(bib.openai_agents_hitl)] <example-hitl_openai_approval>

[#emph[Praktický význam:] HITL má být umístěn před akcemi, u nichž systém nemá dostatečný automatický podklad k bezpečnému rozhodnutí nebo jejichž dopad vyžaduje vlastníka. Nemá nahrazovat deterministickou kontrolu, kterou lze spolehlivě provést automaticky.]

Cílená smyčka určuje, proč pokračovat, guardrail vymezuje, co je automaticky přípustné, a HITL eskaluje rozhodnutí, která mají zůstat člověku. Teprve nad těmito hranicemi má smysl škálovat práci do více agentních větví.

#heading(level: 3)[Orchestrace agentů] <section-agentic_orchestration>
Více agentů není samo o sobě metodou kvality. Delegace je užitečná tehdy, když lze úlohu rozdělit na samostatně zadatelné části, vymezit jejich kontext a určit, kdo vlastní integraci výsledků. Bez těchto hranic paralelismus pouze násobí změny, které je později nutné sjednotit.

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Subagent] <concept-subagent>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Subagent je specializovaná agentní instance, které koordinující běh deleguje vymezenou dílčí úlohu s vlastním kontextem a očekávaným výsledkem. #cite(bib.openai_agent_orchestration)
]

OpenAI Agents SDK rozlišuje například model „agents as tools“, ve kterém centrální agent zůstává vlastníkem konverzace a specialistu volá jako nástroj. Tento vzor je vhodný, když má hlavní běh po dokončení dílčí práce převzít výsledek a rozhodnout o dalším kroku. #cite(bib.openai_agent_orchestration)

#block[#strong[Agent jako nástroj.] Agents SDK umožňuje vystavit specializovaného agenta hlavnímu agentovi přes `agent.as_tool()`, takže delegovaný běh vrátí výsledek zpět koordinátorovi místo převzetí celé konverzace. #cite(bib.openai_agent_orchestration)] <example-subagent_openai_agent_as_tool>

[#emph[Praktický význam:] Subagent má dostat jen kontext a oprávnění potřebná pro jeho dílčí odpovědnost. Návratový kontrakt má být dostatečně explicitní, aby koordinátor mohl výsledek ověřit a integrovat.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Orchestrátor] <concept-orchestrator>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Orchestrátor je koordinační agent nebo komponenta, která rozkládá práci, přiděluje dílčí úlohy specialistům, sleduje jejich výsledky a skládá je do pokračujícího workflow.
]

Anthropic popisuje vzor orchestrator-workers, ve kterém centrální LLM dynamicky určuje potřebné dílčí úlohy, předává je workerům a syntetizuje jejich výsledky. Jako vhodný příklad uvádí coding úlohy, kde nelze předem určit počet a povahu změněných souborů. #cite(bib.anthropic2024tooluse)

#block[#strong[Orchestrator-workers.] Na rozdíl od pevného paralelního workflow určuje orchestrátor za běhu, jaké workery vytvořit a jak jejich výsledky spojit; dynamika tedy vzniká v koordinaci, ne tím, že každý worker vlastní celý proces. #cite(bib.anthropic2024tooluse)] <example-orchestrator_anthropic_workers>

[#emph[Praktický význam:] Orchestrátor má vlastnit rozklad a integraci, zatímco worker má vlastnit jen přidělenou část. Tato hranice snižuje kolize a dovoluje použít odlišné instrukce nebo modely pro různé typy práce.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Předání řízení (Handoff)] <concept-handoff>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Handoff je vzor, ve kterém aktivní agent předá pokračující řízení jinému agentovi, který se stane vykonavatelem následující části interakce nebo úlohy. #cite(bib.openai_agent_orchestration)
]

Tím se liší od subagenta volaného jako nástroj: u centralizované delegace se výsledek vrací orchestrátorovi, zatímco po handoffu pokračuje specialista jako aktivní agent. OpenAI Agents SDK podporuje oba vzory odděleně a dokumentace doporučuje jejich volbu podle toho, zda má centrální agent zůstat vlastníkem workflow. #cite(bib.openai_agent_orchestration)

#block[#strong[Handoff specialistovi.] V routing příkladu Agents SDK triage agent podle typu požadavku předá řízení specializovanému agentovi; následující interakce pak probíhá pod specialistou namísto návratu každého kroku triage agentovi. #cite(bib.openai_agent_orchestration)] <example-handoff_openai_routing>

[#emph[Praktický význam:] Handoff má být explicitní změna vlastníka dalšího kroku. Předání musí zahrnout jen potřebný kontext a zachovat informaci o tom, kdo nyní odpovídá za pokračování.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Graf pracovního postupu (Workflow Graph)] <concept-workflow_graphs>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Graf pracovního postupu je explicitní orientovaný graf, jehož uzly představují vykonavatele nebo kroky a hrany určují možné přechody a tok dat či řízení mezi nimi.
]

Microsoft Agent Framework implementuje tento model pomocí `WorkflowBuilder`, do kterého se přidávají executors a edges a z výsledné definice se sestaví spustitelný workflow. Dokumentace současně podporuje looping patterns, takže obecný workflow graph není synonymem pro DAG: DAG je pouze takový orientovaný graf, který neobsahuje cyklus; workflow s návratovou nebo opakovací hranou tuto podmínku nesplňuje. #cite(bib.microsoft_agent_workflows) #cite(bib.microsoft_agent_looping)

#block[#strong[Microsoft Agent Framework Workflow.] První workflow příklad vytváří dva executors a propojí je hranou přes `WorkflowBuilder`; framework vedle lineárních a větvených toků dokumentuje také loop orchestration. Jde tedy o konkrétní implementaci obecného grafového workflow, nikoli pouze o plán DAG závislostí. #cite(bib.microsoft_agent_workflows) #cite(bib.microsoft_agent_looping)] <example-workflow_graph_microsoft>

[#emph[Praktický význam:] Workflow Graph je vhodný, když musí být pořadí, větvení, paralelismus nebo návratové hrany explicitní a auditovatelné. DAG je vhodnou podmnožinou pro čistě acyklické závislosti, nikoli univerzálním názvem pro každý agentní graf.]

#heading(level: 4, numbering: none, outlined: false, bookmarked: false)[Swarm] <concept-swarm>
#block[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Swarm je popisné označení pro víceagentní uspořádání, ve kterém systém dynamicky vytváří a koordinuje větší počet paralelních subagentů; nejde o jednotný formální standard a vlastnosti konkrétního swarmu jsou vlastnostmi dané implementace.
]

Aktuální Kimi Help Center popisuje Agent Swarm jako produktový režim, ve kterém systém automaticky koordinuje subagenty bez předem definovaných rolí a bez ručně navrženého workflow a používá jej k paralelnímu zpracování složitých úloh. Tyto vlastnosti popisují Kimi Agent Swarm a nesmí být bez dalšího zobecněny na všechny systémy označené jako swarm. #cite(bib.kimi_agent_swarm)

#block[#strong[Kimi Agent Swarm.] Současná produktová dokumentace Kimi uvádí automatickou koordinaci více subagentů a dynamické rozdělení práce jako vlastnosti Agent Swarm; konkrétní produkt se tím liší od ručně definovaného Workflow Graphu, jehož strukturu určuje vývojář. #cite(bib.kimi_agent_swarm)] <example-swarm_kimi_current>

[#emph[Praktický význam:] Swarm-style orchestrace dává smysl pro úlohy s mnoha relativně nezávislými částmi, pokud orchestrátor umí jejich výsledky ověřit a sjednotit. Paralelismus nesmí obejít vlastnictví změn, quality gates ani integrační hranici.]

Celá metodika tak tvoří uzavřený proces: explicitní specifikace určí cíl a akceptaci, plán rozloží práci, větev a Pull Request izolují a zpřístupní změnu, instrukční a kontextová vrstva poskytuje správné podklady, cílené smyčky pracují uvnitř deterministických a lidských hranic a CI s revizí rozhodují o přijetí. Subagenti, handoffy, workflow graphy nebo swarm-style paralelismus tento proces škálují, ale nenahrazují jeho kontrolní body. Tato posloupnost je základem, na kterém může následující část popsat konkrétní realizaci v DarkFactory.

#heading(level: 2)[DarkFactory] <section-darkfactory>
#heading(level: 1)[Výsledky a diskuse] <section-evaluation>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Vyhodnocení odděluje důkazy o jednotlivých mechanismech od důkazů o jejich spolupráci na úrovni systému a od přenosu na konkrétní cílové repozitáře.
]

Metodika těchto důkazů je stanovena v části 1.5; zde se už neopakuje. Vyhodnocení používá reprodukovatelný evidence snapshot DarkFactory na commitu `e9c10221b40589512d262a0edb95f709b923150c` a odpovídající CI run `35616745304`. Snapshot slouží pouze jako pevný referenční bod pro výsledky. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304)

#heading(level: 2)[Ověření mechanismů] <section-mechanism_verification>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Referenční CI run dokončil všech 15 jobů úspěšně a hlavní Bun testovací sada vykázala 670 úspěšných testů ve 102 souborech bez selhání. #cite(bib.darkfactory_ci_35616745304)
]

Samostatné testy ověřují mimo jiné persistenci Run State, detekci neaktuálního Planningu, zachování historie při provider failoveru, odvozování výsledku z pracovního stromu, kontrolu scope a recovery provenance. #cite(bib.darkfactory_e9c10221) Tato evidence podporuje konkrétní mechanismy; sama o sobě neprokazuje úspěšnost celého produkčního životního cyklu.

#heading(level: 2)[Ověření systému] <section-system_verification>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Integrační testy dokazují spolupráci hlavních runtime mechanismů, ale evidence uzavřená 21. září 2026 neobsahuje jeden reprodukovatelný živý průchod celým produkčním životním cyklem změny.
]

Testy pokrývají workflow přechody, review/fix iterace, persistovaný stav, GitHub události, required-check gate, nástrojové účinky, failover a recovery. #cite(bib.darkfactory_e9c10221) Plný df-only průchod od schválení Planningu po merge a následnou rekonciliaci zůstal zároveň otevřenou acceptance položkou Requestu #359, a proto není v této práci považován za prokázaný. #cite(bib.darkfactory_request_359)

#heading(level: 2)[Ověření na repozitářích] <section-repository_verification>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Fleet-level ověření rozlišuje aktivní cílové repozitáře od historických nebo archivovaných položek a hodnotí pouze konkrétní commity s dohledatelnými workflow výsledky.
]

Repozitář `omnis` byl ověřen na commitu `a53660a1c0c6619f94768e5d520405052fb03df6`. Jeho pipeline run `34708160162` dokončil úspěšně mimo jiné web, paper a docs jobs; samostatné deploy-docs a release joby na stejném commitu byly rovněž úspěšné. #cite(bib.omnis_a53660a1) #cite(bib.omnis_ci_34708160162)

Repozitář `ChessWithQuests` byl ověřen na commitu `50a50797f29c2a636d973981993191a65df3d131`. Pipeline run `34708180783` dokončil úspěšně paper, web a docs jobs a na stejném commitu uspěly také verify-docs, deploy-docs a release kontroly. #cite(bib.chesswithquests_50a50797) #cite(bib.chesswithquests_ci_34708180783)

Původně uváděné repozitáře `template-OdbornaPrace` a `OdbornaPrace-mono` jsou v době evaluace archivované a nejsou proto považovány za aktivní fleet cíle. #cite(bib.template_odbornaprace_repo) #cite(bib.odbornaprace_mono_repo)

Aktivním repozitářem práce je `DarkFactory-Paper`, který nahrazuje starší označení `OdbornaPrace-paper`. Snapshot `5bc04974f9aed0f55295389154124a09059ff35e` prošel úspěšně CI, Deploy Documentation i Release workflow. #cite(bib.darkfactory_paper_5bc04974) #cite(bib.darkfactory_paper_ci_35617820423) #cite(bib.darkfactory_paper_deploy_35617820271) #cite(bib.darkfactory_paper_release_35617820286)

Aktivní fleet evidence tedy v této fázi pokrývá DarkFactory, omnis, ChessWithQuests a DarkFactory-Paper. Dvě původní fleet položky jsou archivované; úplné #361 fleet acceptance proto nelze z těchto výsledků považovat za uzavřené.

#heading(level: 2)[Výzkumné otázky] <section-research_question_answers>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Odpovědi jsou omezeny na vlastnosti doložené implementací, automatickými testy, CI a dostupnými provozními artefakty.
]

*O1.* Řízenou autonomii podporuje oddělení schváleného plánu, implementace, deterministického ověření, review/fix smyčky, Final Alignment a merge autorizace. Jejich dílčí kontrakty jsou implementované a testované, ale evidence neobsahuje jeden úplný živý produkční průchod. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_ci_35616745304) #cite(bib.darkfactory_request_359)

*O2.* Přerušený nebo neproduktivní běh lze omezovat pomocí budgetů, klasifikace chyb a failoveru a obnovovat nad persistovaným stavem s kontrolou provenance. Testy tyto mechanismy podporují, nikoli však živou crash/resume idempotenci nad celým produkčním workflow. #cite(bib.darkfactory_e9c10221) #cite(bib.darkfactory_request_359)

*O3.* Trvalý pracovní stav je oddělen od context window: Run State, Session a Transcript mohou existovat mimo aktuální inferenční vstup a aktivní kontext z nich vybírá pouze informace potřebné pro další krok. Tato architektura podporuje pokračování přes hranice modelových běhů, ale nedokazuje nulovou informační ztrátu pro libovolně dlouhou úlohu. #cite(bib.darkfactory_e9c10221)

#heading(level: 2)[Diskuse a omezení] <section-evaluation_discussion_limits>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Dostupná evidence podporuje realizaci a testované vlastnosti jednotlivých mechanismů, nikoli obecné tvrzení o úplné autonomii nebo výkonnostní převaze DarkFactory.
]

Práce neprovádí statistický benchmark úspěšnosti, ceny, latence ani četnosti zacyklení na reprezentativním souboru úloh. Evidence také neobsahuje jeden živý plný Request lifecycle ani úplnou acceptance původně plánované fleety. #cite(bib.darkfactory_request_359) Silnou stránkou evaluace je naopak přímá vazba konkrétních tvrzení na implementační a testovací důkazy, například pozorovaný stav pracovního stromu nebo recovery provenance. #cite(bib.darkfactory_e9c10221)

Evaluace prokazuje implementaci a automatické ověření klíčových mechanismů DarkFactory a současně vymezuje chybějící systémové důkazy. Hlavní cíl je proto hodnocen na úrovni navržené architektury a reprodukovatelně testovaných mechanismů; neprovedený plný živý lifecycle zůstává explicitním omezením závěrů. #cite(bib.darkfactory_request_359)

#heading(level: 1)[Závěr] <section-conclusion>
[
  #set par(first-line-indent: (amount: 1.5em, all: true))
  Práce ukazuje, že delegování softwarové práce agentní AI vyžaduje více než samotnou schopnost jazykového modelu generovat kód: rozhodující jsou mechanismy, které mimo model udržují stav, zprostředkovávají účinky a poskytují ověřitelnou zpětnou vazbu.
]

DarkFactory demonstruje konkrétní realizaci tohoto přístupu a dostupná evaluace podporuje funkčnost klíčových mechanismů i jejich vybraných integrací. Výzkumné otázky proto lze uzavřít na úrovni řízené autonomie, obnovitelnosti běhu a oddělení trvalého stavu od omezeného modelového kontextu.

Rozsah závěru je omezen provedenými důkazy: práce neprokazuje obecnou převahu DarkFactory ani jeden úplný živý průchod celým produkčním životním cyklem změny. Tato hranice je součástí výsledku evaluace, nikoli nahrazena silnějším tvrzením. #cite(bib.darkfactory_request_359)


#metadata("body-end") <body-end-anchor>

// ── Zadní část ───────────────────────────────────────────
#pagebreak(weak: true)
#nadpis-bez-cisla[Seznam zdrojů]
#bibliography("bib/references.bib", style: "iso-690-numeric", title: none, full: true)


// ── Přílohy ──────────────────────────────────────────────
#metadata("appendix-start") <appendix-start-anchor>
#pagebreak(weak: true)

#nadpis-bez-cisla[Seznam obrázků a tabulek]
#outline(title: none, target: figure.where(kind: image).or(figure.where(kind: table)))
#pagebreak(weak: true)

#nadpis-bez-cisla[Seznam příloh]
#counter(heading).update(0)
#set heading(numbering: "A.1", supplement: [Příloha])
#outline(title: none, target: heading.where(level: 1, supplement: [Příloha]))

#heading(level: 1, supplement: [Příloha])[Encyklopedie a rejstřík pojmů] <section-concept_encyclopedia>
Abecední přehled klíčových pojmů použitých v práci. Názvy a definice jsou odvozeny přímo z kanonických sémantických položek.

#block(above: 6pt, below: 2pt)[#link(<concept-agents_directory>, strong([.agents/]))]
`.agents/` je repozitářový nebo uživatelský jmenný prostor Codexu pro znovupoužitelná agentní rozšíření, zejména Skills. #cite(bib.openai_customization_overview)

#block(above: 6pt, below: 2pt)[#link(<concept-claude_directory>, strong([.claude/]))]
`.claude/` je projektový nebo uživatelský jmenný prostor Claude Code pro instrukce, pravidla, nastavení a rozšíření. #cite(bib.claude_code_memory) #cite(bib.claude_code_settings)

#block(above: 6pt, below: 2pt)[#link(<concept-agent_session>, strong([Agentní sezení (Session)]))]
Persistovaná jednotka, která vymezuje jeden souvislý agentní běh a umožňuje jeho pozdější pokračování. #cite(bib.openai_agents_sessions)

#block(above: 6pt, below: 2pt)[#link(<concept-agent_loop>, strong([Agentní smyčka (Agent Loop)]))]
Iterativní cyklus, v němž model vyhodnotí stav, zvolí akci, harness ji provede a výsledek vrátí do další iterace. #cite(bib.yao2022)

#block(above: 6pt, below: 2pt)[#link(<concept-agents_md>, strong([AGENTS.md]))]
AGENTS.md je mechanismus projektových instrukcí Codexu, který dodává agentovi trvalý repozitářový kontext před zahájením práce. #cite(bib.openai_agents_md)

#block(above: 6pt, below: 2pt)[#link(<concept-claude_md>, strong([CLAUDE.md]))]
CLAUDE.md je soubor trvalých instrukcí a kontextu, který Claude Code načítá do sezení. #cite(bib.claude_code_memory)

#block(above: 6pt, below: 2pt)[#link(<concept-goal_loops>, strong([Cílené smyčky (Goal Loops)]))]
Řídicí smyčky, které opakují plánování, provedení a vyhodnocení podle explicitního cíle a ukončovací podmínky. #cite(bib.microsoft_agent_looping)

#block(above: 6pt, below: 2pt)[#link(<concept-context_rot>, strong([Degradace kontextu (Context Rot)]))]
Degradace kontextu (Context Rot) označuje praktický pokles spolehlivosti, s níž model dokáže využívat relevantní informace při růstu délky, informačního zatížení nebo nevýhodném umístění informace v aktivním kontextu. #cite(bib.liu2024)

#block(above: 6pt, below: 2pt)[#link(<concept-skills>, strong([Dovednosti (Skills)]))]
Znovupoužitelný balíček instrukcí a volitelných zdrojů, který se načítá pro úlohy odpovídající jeho účelu. #cite(bib.agent_skills_spec)

#block(above: 6pt, below: 2pt)[#link(<concept-workflow_graphs>, strong([Graf pracovního postupu (Workflow Graph)]))]
Explicitní orientovaný graf workflow, v němž uzly představují vykonavatele nebo kroky a hrany určují možné přechody mezi nimi. #cite(bib.microsoft_agent_workflows)

#block(above: 6pt, below: 2pt)[#link(<concept-guardrail>, strong([Guardrail]))]
V této práci označuje Guardrail programově vynucenou kontrolu, která může před pokračováním běhu validovat nebo zablokovat vstup, výstup či použití nástroje. #cite(bib.openai_agents_guardrails)

#block(above: 6pt, below: 2pt)[#link(<section-harness>, strong([Harness]))]
Harness je běhová vrstva kolem modelové inference, která drží stav, opakuje agentní smyčku a propojuje model s nástroji a prostředím. #cite(bib.anthropic_managed_agents)

#block(above: 6pt, below: 2pt)[#link(<concept-hooks>, strong([Hooks]))]
Konfigurované reakce spouštěné při určených událostech životního cyklu agentního prostředí. #cite(bib.claude_code_hooks)

#block(above: 6pt, below: 2pt)[#link(<concept-inference_engine>, strong([Inferenční engine (Inference Engine)]))]
Inferenční engine je běhová vrstva, která načítá model a skutečně provádí jeho dopředné výpočty a autoregresivní generování nad vstupními tokeny. #cite(bib.vllm_inference_engine)

#block(above: 6pt, below: 2pt)[#link(<concept-integration_test>, strong([Integrační test (Integration Test)]))]
Ověření spolupráce více komponent nebo vrstev systému přes jejich rozhraní. #cite(bib.sommerville2016)

#block(above: 6pt, below: 2pt)[#link(<concept-sandbox>, strong([Izolované prostředí (Sandbox)]))]
Oddělené běhové prostředí, ve kterém agent může spouštět kód nebo měnit pracovní soubory bez přímého přístupu ke všem prostředkům hostitelského systému. #cite(bib.anthropic_managed_agents)

#block(above: 6pt, below: 2pt)[#link(<concept-compaction>, strong([Kompakce kontextu (Context Compaction)]))]
Zmenšení aktivního kontextu nahrazením části historie kratší reprezentací, typicky shrnutím nebo výběrem důležitých informací. #cite(bib.anthropic_context_engineering)

#block(above: 6pt, below: 2pt)[#link(<concept-context_engineering>, strong([Kontextové inženýrství (Context Engineering)]))]
Systematický výběr a správa informací, které jsou modelu zpřístupněny v aktivním kontextu během inference. #cite(bib.anthropic_context_engineering)

#block(above: 6pt, below: 2pt)[#link(<concept-context_window>, strong([Kontextové okno (Context Window)]))]
Kontextové okno je konečný rozsah tokenové sekvence, kterou model může mít v daném inferenčním běhu současně k dispozici jako aktivní vstup. #cite(bib.liu2024)

#block(above: 6pt, below: 2pt)[#link(<concept-mcp>, strong([MCP]))]
Otevřený protokol pro standardizované propojení AI aplikací s externími nástroji a datovými zdroji. #cite(bib.mcp_spec_2026)

#block(above: 6pt, below: 2pt)[#link(<concept-kv_cache>, strong([Mezipaměť klíčů a hodnot (KV Cache)]))]
KV cache je runtime mezipaměť dříve vypočtených klíčů a hodnot pozornostních vrstev pro tokeny již zpracovaného prefixu, které lze znovu použít při autoregresivním dekódování dalších tokenů. #cite(bib.ainslie2023)

#block(above: 6pt, below: 2pt)[#link(<concept-tools>, strong([Nástroje (Tools)]))]
Rozhraní, kterým agent vyvolává operace mimo samotnou textovou inferenci, například čtení dat, volání API nebo změnu stavu systému. #cite(bib.anthropic2024tooluse)

#block(above: 6pt, below: 2pt)[#link(<concept-planning>, strong([Plánování (Planning)]))]
Převod požadavku na explicitní kroky, závislosti a podmínky ověření před prováděním změn. #cite(bib.sommerville2016)

#block(above: 6pt, below: 2pt)[#link(<concept-model_provider>, strong([Poskytovatel modelu (Model Provider)]))]
Poskytovatel modelu je externí služba nebo programové rozhraní, přes které runtime vybírá a volá konkrétní model; provider může mapovat abstraktní jméno modelu na vlastní implementaci modelového API. #cite(bib.openai_model_providers)

#block(above: 6pt, below: 2pt)[#link(<concept-prompt_injection>, strong([Prompt Injection]))]
Manipulace chování jazykového modelu pomocí instrukcí vložených do vstupu nebo do externího obsahu, který systém následně zpracuje jako kontext. #cite(bib.owasp_llm01_prompt_injection)

#block(above: 6pt, below: 2pt)[#link(<concept-prompt_engineering>, strong([Promptové inženýrství (Prompt Engineering)]))]
Systematický návrh instrukcí, příkladů a jejich struktury s cílem ovlivnit chování jazykového modelu. #cite(bib.anthropic_prompt)

#block(above: 6pt, below: 2pt)[#link(<concept-environment>, strong([Prostředí agenta (Agent Environment)]))]
Vnější prostředí, které agent prostřednictvím harnessu pozoruje a mění, například pracovní soubory, procesy, síťové služby a další systémové prostředky. #cite(bib.anthropic_managed_agents)

#block(above: 6pt, below: 2pt)[#link(<concept-continuous_integration>, strong([Průběžná integrace (CI)]))]
Vývojová praxe, při níž se změny průběžně integrují a automaticky ověřují sestavením, testy a dalšími kontrolami. #cite(bib.humble2010)

#block(above: 6pt, below: 2pt)[#link(<concept-pull_request>, strong([Pull Request]))]
Návrh na sloučení změn z jedné větve do jiné, kolem kterého GitHub soustřeďuje revizi, diskusi a automatické kontroly. #cite(bib.github_pull_requests)

#block(above: 6pt, below: 2pt)[#link(<concept-handoff>, strong([Předání řízení (Handoff)]))]
Vzor koordinace, při kterém aktivní agent předá další řízení specializovanému agentovi. #cite(bib.openai_agent_orchestration)

#block(above: 6pt, below: 2pt)[#link(<concept-transcript>, strong([Přepis (Transcript)]))]
Uspořádaný historický záznam událostí vzniklých během #term(terms.agent_session), například zpráv, akcí a výsledků nástrojů. #cite(bib.anthropic_managed_agents)

#block(above: 6pt, below: 2pt)[#link(<concept-rag>, strong([RAG]))]
Architektura, ve které systém před generováním vyhledá relevantní informace z externího zdroje a poskytne je modelu jako další kontext. #cite(bib.lewis2020rag)

#block(above: 6pt, below: 2pt)[#link(<concept-review>, strong([Revize (Review)]))]
Revize je samostatná kontrola změny nebo výstupu proti explicitním požadavkům a kvalitativním kritériím před jeho přijetím.

#block(above: 6pt, below: 2pt)[#link(<concept-slop>, strong([Slop]))]
Neformální označení pro nekvalitní digitální obsah, zejména obsah vytvořený umělou inteligencí. #cite(bib.cambridge2026aislop)

#block(above: 6pt, below: 2pt)[#link(<concept-code_execution>, strong([Spouštění kódu (Code Execution)]))]
Nástrojová schopnost umožňující vykonat program nebo příkaz a vrátit jeho skutečný výstup modelu. #cite(bib.anthropic_code_execution)

#block(above: 6pt, below: 2pt)[#link(<concept-version_control>, strong([Správa verzí (Version Control)]))]
Systém pro zaznamenávání a porovnávání historie změn souborů v čase. #cite(bib.chacon2014)

#block(above: 6pt, below: 2pt)[#link(<concept-state>, strong([Stav (State)]))]
Persistovaná reprezentace aktuálně platných pracovních skutečností a řídicích údajů běhu. #cite(bib.anthropic_managed_agents)

#block(above: 6pt, below: 2pt)[#link(<concept-subagent>, strong([Subagent]))]
Specializovaná agentní instance, které jiný agent nebo orchestrátor deleguje vymezenou dílčí úlohu. #cite(bib.openai_agent_orchestration)

#block(above: 6pt, below: 2pt)[#link(<concept-swarm>, strong([Swarm]))]
Popisné označení pro dynamicky koordinované paralelní provádění více subagenty; nejde o univerzální formální standard. #cite(bib.kimi_agent_swarm)

#block(above: 6pt, below: 2pt)[#link(<concept-system_prompt>, strong([Systémový prompt (System Prompt)]))]
Systémová instrukční vrstva, která vymezuje roli, pravidla a výchozí způsob chování modelu nebo agenta. #cite(bib.anthropic_prompt)

#block(above: 6pt, below: 2pt)[#link(<concept-temperature>, strong([Teplota (Temperature)]))]
Teplota je parametr vzorkování, který u rozhraní, jež jej podporují, mění koncentraci pravděpodobnostního výběru dalších tokenů a tím ovlivňuje variabilitu generovaného výstupu. #cite(bib.openai_responses_temperature)

#block(above: 6pt, below: 2pt)[#link(<concept-token>, strong([Token]))]
Token je diskrétní jednotka sekvence identifikovaná položkou slovníku tokenizéru; podle tokenizační metody může odpovídat celému slovu, části slova nebo jinému textovému fragmentu. #cite(bib.sennrich2016bpe)

#block(above: 6pt, below: 2pt)[#link(<concept-transformer>, strong([Transformer]))]
Transformer je architektura neuronové sítě, která zpracovává vztahy v sekvenci pomocí mechanismů pozornosti místo rekurence či konvoluce jako základního mechanismu pro přenos informace mezi pozicemi. #cite(bib.vaswani2017)

#block(above: 6pt, below: 2pt)[#link(<concept-embedding>, strong([Vektorová reprezentace (Embedding)]))]
Embedding je spojitá vícerozměrná vektorová reprezentace diskrétního prvku, v níž se naučené geometrické vztahy mohou využít k zachycení podobnosti a dalších vztahů mezi reprezentovanými objekty. #cite(bib.mikolov2013word2vec)

#block(above: 6pt, below: 2pt)[#link(<concept-language_model>, strong([Velký jazykový model (LLM)]))]
Velký jazykový model (LLM) je parametrický model pravděpodobnostního rozdělení nad posloupnostmi tokenů; autoregresivní LLM generuje pokračování postupným odhadem dalšího tokenu z již dostupného kontextu. #cite(bib.brown2020)

#block(above: 6pt, below: 2pt)[#link(<concept-vibe_coding>, strong([Vibe Coding]))]
Způsob tvorby softwaru, při kterém člověk iteruje pomocí pokynů v přirozeném jazyce bez průběžné kontroly vygenerovaného kódu. #cite(bib.karpathy2025vibecoding)

#block(above: 6pt, below: 2pt)[#link(<concept-context_injection>, strong([Vkládání kontextu (Context Injection)]))]
V této práci označuje Context Injection cílené vložení relevantních informací do aktivního kontextu až v okamžiku, kdy jsou potřebné pro aktuální krok. #cite(bib.anthropic_context_engineering)

#block(above: 6pt, below: 2pt)[#link(<concept-tool_calling>, strong([Vyvolávání nástrojů (Tool Calling)]))]
Mechanismus, kterým model místo běžné textové odpovědi vybere konkrétní #term(terms.tools) a vytvoří strukturované argumenty pro jeho vyvolání. #cite(bib.anthropic2024tooluse)

#block(above: 6pt, below: 2pt)[#link(<concept-spec_driven_development>, strong([Vývoj řízený specifikací (Spec-Driven Development)]))]
Přístup k AI-asistovanému vývoji, ve kterém explicitní specifikace řídí plánování, implementaci a ověřování změny. #cite(bib.github_spec_kit)

#block(above: 6pt, below: 2pt)[#link(<concept-branch>, strong([Větev (Branch)]))]
Oddělená linie vývoje v systému správy verzí, která ukazuje na vlastní posloupnost commitů. #cite(bib.chacon2014)

#block(above: 6pt, below: 2pt)[#link(<concept-human_in_the_loop>, strong([Člověk ve smyčce (HITL)]))]
Uspořádání automatizovaného procesu, ve kterém člověk v určených bodech poskytuje schválení nebo rozhodnutí před pokračováním. #cite(bib.openai_agents_hitl)


// ── Výpočet rozsahu práce ─────────────────────────────────
#context {
  let core = sel => selector(sel)
    .after(<body-start-anchor>, inclusive: false)
    .before(<body-end-anchor>, inclusive: false)

  let containers = selector(list).or(enum).or(std.terms).or(table).or(figure.caption)
  let nested-par-locs = query(core(selector(par).within(containers))).map(it => it.location())
  let nested-list-locs = query(core(selector(list).within(containers))).map(it => it.location())
  let nested-enum-locs = query(core(selector(enum).within(containers))).map(it => it.location())
  let nested-terms-locs = query(core(selector(std.terms).within(containers))).map(it => it.location())
  let nested-table-locs = query(core(selector(table).within(containers))).map(it => it.location())

  let review-words = 0
  let review-chars = 0
  let stats-of = item => string-word-count(extract-text(item))

  for p in query(core(par)) {
    if p.location() not in nested-par-locs {
      let s = stats-of(p.body)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(list)) {
    if item.location() not in nested-list-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(enum)) {
    if item.location() not in nested-enum-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(std.terms)) {
    if item.location() not in nested-terms-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for item in query(core(table)) {
    if item.location() not in nested-table-locs {
      let s = stats-of(item)
      review-words += s.words
      review-chars += s.characters
    }
  }
  for h in query(core(heading)) {
    let s = stats-of(h.body)
    review-words += s.words
    review-chars += s.characters
  }
  for caption in query(core(figure.caption)) {
    let s = stats-of(caption)
    review-words += s.words
    review-chars += s.characters
  }
  for item in query(core(<callout>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }
  for item in query(core(<removed-diff>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }
  for item in query(core(<diff-prefix>)) {
    let s = stats-of(item)
    review-words -= s.words
    review-chars -= s.characters
  }

  let review-stats = (
    words: calc.max(0, review-words),
    chars: calc.max(0, review-chars),
  )
  let stats = (raw: review-stats, review: review-stats)
  word-stats-state.update(stats)
  [#metadata(stats) <word-stats>]
}
