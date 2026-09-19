#import "common.typ": define-term, translation

// Canonical terminology database for the thesis.
// Every concept has a proper/formal name and may additionally expose an
// industry/common name. Manuscript references use these shared values only.
#let vocabulary = (
  agent: define-term(
    id: "agent",
    proper: translation(cs: "Agent", en: "Agent"),
    explanation_cs: "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného inženýrského cíle.",
    explanation_en: "A software system driven by a language model and equipped with tools that independently plans, observes its environment, and performs multi-step actions toward a specified engineering goal.",
  ),

  agent_loop: define-term(
    id: "agent-loop",
    proper: translation(cs: "Smyčka ReAct", en: "ReAct Loop"),
    industry: translation(cs: "Agent Loop", en: "Agent Loop"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Iterativní prováděcí cyklus autonomního agenta založený na vzoru ReAct (Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.",
    explanation_en: "An iterative execution cycle of an autonomous agent based on the ReAct pattern (Reasoning + Acting), in which the model alternates between reasoning, tool calls, and evaluation of observations from the runtime environment.",
  ),

  language_model: define-term(
    id: "language-model",
    proper: translation(cs: "Jazykový model", en: "Large Language Model"),
    industry: translation(cs: "LLM", en: "LLM"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Velký jazykový model je neuronový model trénovaný nad rozsáhlými textovými daty, který autoregresivně zpracovává a generuje posloupnosti tokenů. V této práci vystupuje jako inferenční kognitivní jádro agentního systému.",
    explanation_en: "A large language model is a neural model trained on large-scale textual data that autoregressively processes and generates token sequences. In this thesis it serves as the inference-based cognitive core of an agentic system.",
  ),

  chatbot: define-term(
    id: "chatbot",
    proper: translation(cs: "Chatbot", en: "Chatbot"),
    explanation_cs: "Systém založený na jazykovém modelu určený primárně k textové interakci s uživatelem; odpovídá na jednotlivé požadavky, ale sám o sobě nedisponuje autonomní prováděcí smyčkou ani nástroji pro samostatnou modifikaci okolního prostředí.",
    explanation_en: "A language-model-based system designed primarily for text interaction with a user; it responds to individual requests but does not by itself provide an autonomous execution loop or tools for independently modifying the surrounding environment.",
  ),

  context_rot: define-term(
    id: "context-rot",
    proper: translation(cs: "Degradace kontextu", en: "Context Rot"),
    explanation_cs: "Degradace pozornosti a kvality logického uvažování modelu způsobená zaplněním kontextového okna dlouhou historií, šumem nebo vzájemně si konkurujícími informacemi, která vede k přehlížení instrukcí a ztrátě souvislostí.",
    explanation_en: "Degradation in a model's attention and reasoning quality caused by long, noisy, or internally competing context, leading to missed instructions and loss of relationships between facts.",
  ),

  embedding: define-term(
    id: "embedding",
    proper: translation(cs: "Vektorová reprezentace", en: "Embedding"),
    industry: translation(cs: "Embedding", en: "Embedding"),
    explanation_cs: "Vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné sémantické vztahy mezi reprezentacemi.",
    explanation_en: "A multidimensional vector representation of tokens or other data in which numerical relationships between vectors capture useful semantic relationships between representations.",
  ),

  version_control: define-term(
    id: "version-control",
    proper: translation(cs: "Správa verzí", en: "Version control"),
    explanation_cs: "Správa a sledování změn zdrojových souborů a dalších verzovaných artefaktů tak, aby bylo možné změny bezpečně větvit, slučovat, auditovat a v případě potřeby vracet.",
    explanation_en: "The management and tracking of changes to source files and other versioned artifacts so changes can be safely branched, merged, audited, and reverted when necessary.",
  ),

  git: define-term(
    id: "git",
    proper: translation(cs: "Git", en: "Git"),
    explanation_cs: "Distribuovaný systém správy verzí, který uchovává historii projektu, podporuje větvení a slučování změn a umožňuje deterministický návrat k předchozím stavům repozitáře.",
    explanation_en: "A distributed version-control system that records project history, supports branching and merging, and enables deterministic return to earlier repository states.",
  ),

  github: define-term(
    id: "github",
    proper: translation(cs: "GitHub", en: "GitHub"),
    explanation_cs: "Cloudová platforma pro hosting gitových repozitářů, správu vývojového cyklu pomocí Issues a Pull Requests a automatizaci CI/CD pracovních postupů.",
    explanation_en: "A platform for hosting Git repositories and coordinating the software-development lifecycle through features such as Issues, Pull Requests, and CI/CD automation.",
  ),

  agentic_engineering: define-term(
    id: "agentic-engineering",
    proper: translation(cs: "Agentní inženýrství", en: "Agentic Engineering"),
    explanation_cs: "Inženýrská disciplína zaměřená na návrh, orchestraci a provoz agentních systémů kolem jazykových modelů, včetně nástrojů, kontextu, prováděcích smyček, bezpečnostních mantinelů a lidského dohledu.",
    explanation_en: "An engineering discipline focused on designing, orchestrating, and operating agentic systems around language models, including tools, context, execution loops, guardrails, and human oversight.",
  ),

  harness: define-term(
    id: "harness",
    proper: translation(cs: "Řídicí systém", en: "Control Harness"),
    industry: translation(cs: "Harness", en: "Harness"),
    default-name-type: "industry",
    keyword-name-type: "both",
    explanation_cs: "Řídicí postroj — aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která zajišťuje běhové prostředí nástrojů, dynamickou správu kontextového okna, bezpečnostní mantinely, práci se stavem a deterministické řízení životního cyklu požadavku.",
    explanation_en: "The control harness — an application and orchestration layer surrounding a model's inference core that provides the tool runtime, dynamic context-window management, guardrails, state handling, and deterministic control over the request lifecycle.",
  ),

  human_in_the_loop: define-term(
    id: "human-in-the-loop",
    proper: translation(cs: "Zapojení člověka do smyčky", en: "Human-in-the-loop"),
    industry: translation(cs: "HITL", en: "HITL"),
    explanation_cs: "Návrhový vzor, v němž lidský operátor zůstává součástí rozhodovacího procesu systému prostřednictvím schvalovacích bran (Human Gates), zejména před významnými nebo nevratnými systémovými operacemi.",
    explanation_en: "A design pattern in which a human operator remains part of the system's decision process through approval gates (Human Gates), especially before consequential or irreversible system operations.",
  ),

  mcp: define-term(
    id: "mcp",
    proper: translation(cs: "Model Context Protocol", en: "Model Context Protocol"),
    industry: translation(cs: "MCP", en: "MCP"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Model Context Protocol — otevřený standard původně navržený společností Anthropic pro standardizovanou komunikaci AI aplikací s externími nástroji, zdroji a daty prostřednictvím zpráv JSON-RPC.",
    explanation_en: "Model Context Protocol — an open standard originally introduced by Anthropic for standardized communication between AI applications and external tools, resources, and data through JSON-RPC messages.",
  ),

  plugins: define-term(
    id: "plugins",
    proper: translation(cs: "Zásuvné moduly", en: "Plugins"),
    industry: translation(cs: "Plugins", en: "Plugins"),
    explanation_cs: "Zásuvné moduly běžící přímo v prostředí harnessu, které rozšiřují jeho exekuční jádro o specializované systémové adaptéry, ovladače nástrojů a deterministické záchytné body.",
    explanation_en: "Programmatic extension modules running directly in the harness environment that extend its execution core with specialized system adapters, tool drivers, and deterministic hooks.",
  ),

  prompt_engineering: define-term(
    id: "prompt-engineering",
    proper: translation(cs: "Promptové inženýrství", en: "Prompt Engineering"),
    explanation_cs: "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.",
    explanation_en: "An engineering discipline for systematically designing, structuring, and optimizing instructions and system prompts to guide and constrain language-model behavior.",
  ),

  pull_request: define-term(
    id: "pull-request",
    proper: translation(cs: "Požadavek na sloučení", en: "Pull Request"),
    industry: translation(cs: "Pull Request", en: "Pull Request"),
    default-name-type: "industry",
    keyword-name-type: "both",
    explanation_cs: "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako místo pro automatizované kontroly, lidskou revizi a diskusi nad navrženými úpravami.",
    explanation_en: "A formal proposal to integrate changes from one repository branch into another, providing a place for automated checks, human review, and discussion of the proposed changes.",
  ),

  skills: define-term(
    id: "skills",
    proper: translation(cs: "Dovednosti", en: "Skills"),
    industry: translation(cs: "Skills", en: "Skills"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Znovupoužitelné modulární balíčky instrukcí (typicky definovaných v souboru SKILL.md), procedurálních pravidel a volitelných pomocných skriptů či zdrojů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.",
    explanation_en: "Reusable modular packages of instructions (typically defined in a SKILL.md file), procedural rules, and optional helper scripts or resources that a harness dynamically loads into an agent's context for a particular class of task.",
  ),
)
