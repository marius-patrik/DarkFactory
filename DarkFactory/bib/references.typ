// Canonical bibliographic reference variables mirroring bib/references.bib.
// Used for structured citation and source attribution on terminology and concepts.

#let darkfactory = <darkfactory>
#let humble2010 = <humble2010>
#let chacon2014 = <chacon2014>
#let vaswani2017 = <vaswani2017>
#let anthropic_mcp = <anthropic-mcp>
#let anthropic_prompt = <anthropic-prompt>
#let yao2022 = <yao2022>
#let liu2024 = <liu2024>
#let dao2022 = <dao2022>
#let ainslie2023 = <ainslie2023>
#let wang2024survey = <wang2024survey>
#let schick2023toolformer = <schick2023toolformer>
#let lewis2020rag = <lewis2020rag>
#let jiang2023llmlingua = <jiang2023llmlingua>
#let agache2020firecracker = <agache2020firecracker>
#let mosqueira2023human = <mosqueira2023human>
#let sennrich2016bpe = <sennrich2016bpe>
#let mikolov2013word2vec = <mikolov2013word2vec>
#let wu2023autogen = <wu2023autogen>
#let sommerville2016 = <sommerville2016>
#let anthropic2024tooluse = <anthropic2024tooluse>
#let karpathy2025vibecoding = <karpathy2025vibecoding>
#let willison2025vibecoding = <willison2025vibecoding>
#let cambridge2026aislop = <cambridge2026aislop>
#let agent_skills_spec = <agentskills-spec>
#let openai_structured_outputs = <openai2024structuredoutputs>
#let anthropic_code_execution = <anthropic2026codeexecution>
#let fowler2025sdd = <fowler2025sdd>
#let coderabbit2026vibehistory = <coderabbit2026vibehistory>
#let openai_agents_sessions = <openai-agents-sessions>
#let openai_agents_guardrails = <openai-agents-guardrails>
#let claude_code_plugins = <claude-code-plugins>
#let claude_code_hooks = <claude-code-hooks>
#let claude_code_mcp = <claude-code-mcp>
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
#let microsoft_ai_diffusion_2026 = <microsoft-ai-diffusion-2026>
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
#let bib = (
  darkfactory: darkfactory,
  humble2010: humble2010,
  chacon2014: chacon2014,
  vaswani2017: vaswani2017,
  anthropic_mcp: anthropic_mcp,
  anthropic_prompt: anthropic_prompt,
  yao2022: yao2022,
  liu2024: liu2024,
  dao2022: dao2022,
  ainslie2023: ainslie2023,
  wang2024survey: wang2024survey,
  schick2023toolformer: schick2023toolformer,
  lewis2020rag: lewis2020rag,
  jiang2023llmlingua: jiang2023llmlingua,
  agache2020firecracker: agache2020firecracker,
  mosqueira2023human: mosqueira2023human,
  sennrich2016bpe: sennrich2016bpe,
  mikolov2013word2vec: mikolov2013word2vec,
  wu2023autogen: wu2023autogen,
  sommerville2016: sommerville2016,
  anthropic2024tooluse: anthropic2024tooluse,
  karpathy2025vibecoding: karpathy2025vibecoding,
  willison2025vibecoding: willison2025vibecoding,
  cambridge2026aislop: cambridge2026aislop,
  agent_skills_spec: agent_skills_spec,
  openai_structured_outputs: openai_structured_outputs,
  anthropic_code_execution: anthropic_code_execution,
  fowler2025sdd: fowler2025sdd,
  coderabbit2026vibehistory: coderabbit2026vibehistory,
  openai_agents_sessions: openai_agents_sessions,
  openai_agents_guardrails: openai_agents_guardrails,
  claude_code_plugins: claude_code_plugins,
  claude_code_hooks: claude_code_hooks,
  claude_code_mcp: claude_code_mcp,
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
  microsoft_ai_diffusion_2026: microsoft_ai_diffusion_2026,
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
)
