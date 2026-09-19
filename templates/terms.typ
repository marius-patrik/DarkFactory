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

  script: define-term(
    id: "script",
    proper: translation(cs: "Skript", en: "Script"),
    explanation_cs: "Soubor nebo posloupnost příkazů určených k automatizovanému vykonání interpretem, shellem nebo jiným běhovým prostředím.",
    explanation_en: "A file or sequence of commands intended for automated execution by an interpreter, shell, or another runtime.",
  ),

  hook: define-term(
    id: "hook",
    proper: translation(cs: "Událostní záchytný bod", en: "Event Hook"),
    industry: translation(cs: "Hook", en: "Hook"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Definovaný bod životního cyklu nebo události, na který lze navázat vlastní deterministickou logiku před, po nebo místo standardního chování systému.",
    explanation_en: "A defined lifecycle or event point to which custom deterministic logic can be attached before, after, or in place of standard system behavior.",
  ),

  token: define-term(
    id: "token",
    proper: translation(cs: "Token", en: "Token"),
    explanation_cs: "Diskrétní jednotka zpracovávaná jazykovým modelem. Token odpovídá položce slovníku tokenizéru a je reprezentován číselným identifikátorem; nemusí odpovídat celému slovu.",
    explanation_en: "A discrete unit processed by a language model. A token corresponds to an entry in the tokenizer vocabulary and is represented by a numeric identifier; it need not correspond to a whole word.",
  ),

  tokenizer: define-term(
    id: "tokenizer",
    proper: translation(cs: "Tokenizér", en: "Tokenizer"),
    explanation_cs: "Komponenta, která převádí text nebo jiný vstup na posloupnost tokenů a jejich identifikátorů a podle podporovaného směru také provádí zpětnou dekódovací transformaci.",
    explanation_en: "A component that maps text or another input into a sequence of tokens and token identifiers and, where supported, performs the reverse decoding transformation.",
  ),

  transformer: define-term(
    id: "transformer",
    proper: translation(cs: "Transformerová architektura", en: "Transformer Architecture"),
    industry: translation(cs: "Transformer", en: "Transformer"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Architektura neuronových sítí založená na mechanismu pozornosti, která modeluje vztahy mezi prvky sekvence a tvoří základ většiny současných velkých jazykových modelů.",
    explanation_en: "A neural-network architecture based on attention mechanisms that models relationships among sequence elements and underlies most contemporary large language models.",
  ),

  context_window: define-term(
    id: "context-window",
    proper: translation(cs: "Kontextové okno", en: "Context Window"),
    explanation_cs: "Maximální rozsah tokenové sekvence, kterou model při jednom běhu dokáže zahrnout do aktivního kontextu. Prakticky omezuje součet instrukcí, historie, nástrojových výstupů a dalších dat předávaných modelu.",
    explanation_en: "The maximum token-sequence span a model can include in active context during one inference run. In practice it limits the combined instructions, history, tool outputs, and other data supplied to the model.",
  ),

  compaction: define-term(
    id: "context-compaction",
    proper: translation(cs: "Kompakce kontextu", en: "Context Compaction"),
    industry: translation(cs: "Compaction", en: "Compaction"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Proces zmenšení aktivního kontextu, typicky shrnutím, výběrem nebo nahrazením starších částí historie kompaktnější reprezentací tak, aby se běh vešel do kontextového okna.",
    explanation_en: "The process of reducing active context, typically by summarizing, selecting, or replacing older history with a more compact representation so execution remains within the context window.",
  ),

  software_engineering: define-term(
    id: "software-engineering",
    proper: translation(cs: "Softwarové inženýrství", en: "Software Engineering"),
    explanation_cs: "Systematické uplatňování inženýrských principů na specifikaci, návrh, implementaci, ověřování, provoz a údržbu softwarových systémů.",
    explanation_en: "The systematic application of engineering principles to the specification, design, implementation, verification, operation, and maintenance of software systems.",
  ),

  continuous_integration: define-term(
    id: "continuous-integration",
    proper: translation(cs: "Průběžná integrace", en: "Continuous Integration"),
    industry: translation(cs: "CI", en: "CI"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Vývojová praxe, při níž se změny často integrují a automaticky ověřují sestavením, testy a dalšími kontrolami, aby se integrační chyby odhalily co nejdříve.",
    explanation_en: "A development practice in which changes are integrated frequently and automatically verified by builds, tests, and other checks so integration failures are detected early.",
  ),

  github_actions: define-term(
    id: "github-actions",
    proper: translation(cs: "GitHub Actions", en: "GitHub Actions"),
    industry: translation(cs: "Actions", en: "Actions"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Automatizační platforma GitHubu, která spouští deklarované workflow a jejich joby v reakci na události repozitáře nebo ruční spuštění.",
    explanation_en: "GitHub's automation platform for running declared workflows and their jobs in response to repository events or manual dispatch.",
  ),

  dag: define-term(
    id: "dag",
    proper: translation(cs: "Orientovaný acyklický graf", en: "Directed Acyclic Graph"),
    industry: translation(cs: "DAG", en: "DAG"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Orientovaný graf bez orientovaného cyklu. V pracovních postupech umožňuje explicitně vyjádřit závislosti mezi kroky a pořadí, které z nich vyplývá.",
    explanation_en: "A directed graph containing no directed cycle. In workflows it can explicitly represent dependencies among steps and the ordering implied by those dependencies.",
  ),

  container: define-term(
    id: "container",
    proper: translation(cs: "Softwarový kontejner", en: "Software Container"),
    industry: translation(cs: "Container", en: "Container"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Izolované uživatelské běhové prostředí balící aplikaci a její závislosti při sdílení jádra hostitelského operačního systému; úroveň bezpečnostní izolace závisí na konkrétní implementaci a konfiguraci.",
    explanation_en: "An isolated user-space runtime packaging an application and its dependencies while sharing the host operating-system kernel; its security isolation depends on the implementation and configuration.",
  ),

  kv_cache: define-term(
    id: "kv-cache",
    proper: translation(cs: "Mezipaměť klíčů a hodnot", en: "Key–Value Cache"),
    industry: translation(cs: "KV Cache", en: "KV Cache"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Mezipaměť dříve vypočtených vektorů klíčů a hodnot v pozornostních vrstvách transformeru, která při autoregresivním generování omezuje nutnost opakovaně přepočítávat předchozí tokeny.",
    explanation_en: "A cache of previously computed key and value vectors in transformer attention layers that reduces repeated computation of earlier tokens during autoregressive generation.",
  ),

  turn: define-term(
    id: "turn",
    proper: translation(cs: "Tah interakce", en: "Interaction Turn"),
    industry: translation(cs: "Turn", en: "Turn"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Jedna diskrétní jednotka interakce v konverzačním nebo agentním protokolu, například zpráva uživatele, odpověď modelu nebo samostatně evidovaný výsledek nástroje.",
    explanation_en: "One discrete unit of interaction in a conversational or agentic protocol, such as a user message, model response, or separately recorded tool result.",
  ),

  context_engineering: define-term(
    id: "context-engineering",
    proper: translation(cs: "Kontextové inženýrství", en: "Context Engineering"),
    explanation_cs: "Systematický návrh, výběr, pořadí a životní cyklus informací zpřístupňovaných modelu v aktivním kontextu, včetně instrukcí, paměti, nástrojových výsledků a externě načtených dat.",
    explanation_en: "The systematic design, selection, ordering, and lifecycle management of information made available to a model in active context, including instructions, memory, tool results, and externally retrieved data.",
  ),

  loop_engineering: define-term(
    id: "loop-engineering",
    proper: translation(cs: "Inženýrství prováděcí smyčky", en: "Execution-loop Engineering"),
    industry: translation(cs: "Loop Engineering", en: "Loop Engineering"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Návrh a řízení iterativní prováděcí smyčky agenta: stavových přechodů, podmínek ukončení, rozpočtů, opakování, eskalací a vazby mezi rozhodováním modelu a nástroji.",
    explanation_en: "The design and control of an agent's iterative execution loop, including state transitions, termination conditions, budgets, retries, escalation, and the connection between model decisions and tools.",
  ),

  graph_engineering: define-term(
    id: "graph-engineering",
    proper: translation(cs: "Inženýrství pracovních grafů", en: "Workflow-graph Engineering"),
    industry: translation(cs: "Graph Engineering", en: "Graph Engineering"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Návrh agentních nebo automatizačních pracovních postupů jako explicitních grafů uzlů, závislostí a přechodů namísto jediné neomezené smyčky.",
    explanation_en: "The design of agentic or automation workflows as explicit graphs of nodes, dependencies, and transitions rather than as one unconstrained loop.",
  ),

  rag: define-term(
    id: "rag",
    proper: translation(cs: "Generování rozšířené vyhledáváním", en: "Retrieval-Augmented Generation"),
    industry: translation(cs: "RAG", en: "RAG"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Architektura, v níž systém před generováním nebo během něj vyhledá relevantní informace z externího zdroje a vloží je do kontextu modelu, aby výstup mohl být založen na načtených datech.",
    explanation_en: "An architecture in which a system retrieves relevant information from an external source before or during generation and places it into model context so the output can be grounded in the retrieved data.",
  ),

  merge: define-term(
    id: "merge",
    proper: translation(cs: "Sloučení větví", en: "Branch Merge"),
    industry: translation(cs: "Merge", en: "Merge"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Operace správy verzí, která kombinuje změny nebo historii dvou vývojových linií do společného výsledného stavu; konflikty vyžadují explicitní vyřešení.",
    explanation_en: "A version-control operation that combines changes or history from two lines of development into a common resulting state; conflicts require explicit resolution.",
  ),

  squash: define-term(
    id: "squash",
    proper: translation(cs: "Sloučení commitů", en: "Commit Squashing"),
    industry: translation(cs: "Squash", en: "Squash"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Operace, při níž se více po sobě jdoucích commitů nahradí jedním souhrnným commitem, obvykle za účelem zjednodušení historie před integrací změn.",
    explanation_en: "An operation that replaces multiple consecutive commits with one aggregate commit, commonly to simplify history before integrating changes.",
  ),

  branch: define-term(
    id: "branch",
    proper: translation(cs: "Větev repozitáře", en: "Repository Branch"),
    industry: translation(cs: "Branch", en: "Branch"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Pojmenovaná vývojová linie v systému správy verzí, která umožňuje provádět změny odděleně od jiné linie historie a později je porovnat nebo sloučit.",
    explanation_en: "A named line of development in version control that allows changes to proceed separately from another history line and later be compared or merged.",
  ),

)
