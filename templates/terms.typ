#import "common.typ": define-term

// Canonical terminology database for the thesis.
// All manuscript references use these values; definitions are authored once here.
#let vocabulary = (
  agent: define-term(
    id: "agent",
    cs: "Agent",
    en: "Agent",
    explanation_cs: "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného inženýrského cíle.",
    explanation_en: "A software system driven by a language model and equipped with tools that independently plans, observes its environment, and performs multi-step actions toward a specified engineering goal.",
  ),
  agent_loop: define-term(
    id: "agent-loop",
    cs: "Agentní smyčka",
    en: "Agent Loop",
    explanation_cs: "Iterativní prováděcí cyklus autonomního agenta založený na vzoru ReAct (Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.",
    explanation_en: "An iterative execution cycle of an autonomous agent based on the ReAct pattern (Reasoning + Acting), in which the model alternates between reasoning, tool calls, and evaluation of observations from the runtime environment.",
  ),
  chatbot: define-term(
    id: "chatbot",
    cs: "Chatbot",
    en: "Chatbot",
    explanation_cs: "Systém založený na jazykovém modelu určený primárně k textové interakci s uživatelem; odpovídá na jednotlivé požadavky, ale sám o sobě neposkytuje autonomní prováděcí smyčku pro změny okolního prostředí.",
    explanation_en: "A language-model-based system designed primarily for text interaction with a user; it responds to individual requests but does not by itself provide an autonomous execution loop for modifying the surrounding environment.",
  ),
  context_rot: define-term(
    id: "context-rot",
    cs: "Degradace kontextu",
    en: "Context Rot",
    explanation_cs: "Degradace pozornosti a kvality logického uvažování modelu způsobená dlouhým, zašuměným nebo vzájemně si konkurujícím kontextem, která vede k přehlížení instrukcí a ztrátě souvislostí.",
    explanation_en: "Degradation in a model's attention and reasoning quality caused by long, noisy, or internally competing context, leading to missed instructions and loss of relationships between facts.",
  ),
  embedding: define-term(
    id: "embedding",
    cs: "Vektorová reprezentace",
    en: "Embedding",
    explanation_cs: "Vícerozměrná vektorová reprezentace tokenů nebo jiných dat, v níž numerické vztahy mezi vektory zachycují užitečné sémantické vztahy mezi reprezentacemi.",
    explanation_en: "A multidimensional vector representation of tokens or other data in which numerical relationships between vectors capture useful semantic relationships between representations.",
  ),
  git: define-term(
    id: "git",
    cs: "Git",
    en: "Git",
    explanation_cs: "Distribuovaný systém správy verzí, který uchovává historii projektu, podporuje větvení a slučování změn a umožňuje deterministický návrat k předchozím stavům repozitáře.",
    explanation_en: "A distributed version-control system that records project history, supports branching and merging, and enables deterministic return to earlier repository states.",
  ),
  github: define-term(
    id: "github",
    cs: "GitHub",
    en: "GitHub",
    explanation_cs: "Platforma pro hosting gitových repozitářů a koordinaci vývojového cyklu pomocí funkcí jako Issues, Pull Requests a automatizace CI/CD.",
    explanation_en: "A platform for hosting Git repositories and coordinating the software-development lifecycle through features such as Issues, Pull Requests, and CI/CD automation.",
  ),
  harness: define-term(
    id: "harness",
    cs: "Řídicí harness",
    en: "Harness",
    explanation_cs: "Aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která poskytuje nástroje, správu kontextu, bezpečnostní mantinely, práci se stavem a řízení prováděcího životního cyklu.",
    explanation_en: "The application and orchestration layer surrounding a model's inference core, providing tools, context management, guardrails, state handling, and control over the execution lifecycle.",
  ),
  human_in_the_loop: define-term(
    id: "human-in-the-loop",
    cs: "Zapojení člověka do smyčky",
    en: "Human-in-the-loop",
    explanation_cs: "Návrhový vzor, v němž lidský operátor zůstává součástí rozhodovacího procesu systému, například prostřednictvím schvalovacích bran před vybranými významnými akcemi.",
    explanation_en: "A design pattern in which a human operator remains part of the system's decision process, for example through approval gates before selected consequential actions.",
  ),
  mcp: define-term(
    id: "mcp",
    cs: "Model Context Protocol",
    en: "Model Context Protocol (MCP)",
    explanation_cs: "Otevřený protokol pro standardizované připojování AI aplikací k externím nástrojům, zdrojům a datům.",
    explanation_en: "An open protocol for connecting AI applications to external tools, resources, and data sources through standardized interfaces.",
  ),
  plugins: define-term(
    id: "plugins",
    cs: "Zásuvné moduly",
    en: "Plugins",
    explanation_cs: "Programové rozšiřující moduly běžící v prostředí harnessu, které přidávají specializované adaptéry, nástroje nebo deterministické exekuční chování.",
    explanation_en: "Programmatic extension modules running in the harness environment that add specialized adapters, tools, or deterministic execution behavior.",
  ),
  prompt_engineering: define-term(
    id: "prompt-engineering",
    cs: "Promptové inženýrství",
    en: "Prompt Engineering",
    explanation_cs: "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.",
    explanation_en: "An engineering discipline for systematically designing, structuring, and optimizing instructions and system prompts to guide and constrain language-model behavior.",
  ),
  pull_request: define-term(
    id: "pull-request",
    cs: "Pull Request",
    en: "Pull Request",
    explanation_cs: "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako místo pro automatizované kontroly, lidskou revizi a diskusi nad navrženými úpravami.",
    explanation_en: "A formal proposal to integrate changes from one repository branch into another, providing a place for automated checks, human review, and discussion of the proposed changes.",
  ),
  skills: define-term(
    id: "skills",
    cs: "Dovednosti",
    en: "Skills",
    explanation_cs: "Znovupoužitelné modulární balíčky instrukcí, procedurálních pravidel a volitelných pomocných zdrojů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.",
    explanation_en: "Reusable modular packages of instructions, procedural rules, and optional helper resources that a harness dynamically loads into an agent's context for a particular class of task.",
  ),
)
