// 2.3 Agentic engineering.
#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) označuje soubor postupů, jimiž se vývoj softwaru pomocí coding agentů stává účinným, kontrolovaným, opakovatelným a škálovatelným @willison-agentic-engineering. Jeho předmětem není samotný agent ani jeho model, ale systém, v němž agent pracuje: zadání, omezení, nástroje, pravidla integrace a odpovědnost člověka. Odtud také jeho popis jako archetypu #strong[agentického inženýra], jehož přidanou hodnotu už netvoří psaní kódu, ale formulace zadání, řízení agentních běhů a kritické posouzení strojem vytvořených výstupů @alenezi2026agentic. Mezi hlavní oblasti patří: #strong[Prompt Engineering], #strong[Context Engineering], #strong[Harness Engineering], #strong[Loop Engineering] a #strong[Workflow/Graph Engineering] @openai-prompt-engineering @anthropic-context-engineering @anthropic-harness-design @openai-agents-sandbox @openai-agent-orchestration. Cílem je, aby vývojář mohl efektivně a kontrolovaně delegovat dílčí úkoly agentovi, aniž by ztratil přehled o záměru, rozsahu a kvalitě výsledku.


#heading(level: 3)[Zadání a kontext]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo *spec-driven development*, dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku. Přitom jde o postup používaný i v klasickém vývoji softwaru.

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku @openai-prompt-engineering. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @anthropic-context-engineering. 

#heading(level: 3)[Dovednosti]

Zadání určuje, co má agent udělat; dovednosti určují, co je mu vůbec umožněno
udělat. Druhou skupinu zajišťuje harness, a je proto vhodné ji od zadání oddělit:
změna dovedností nemění úkol, změna zadání nemění oprávnění.

#strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy; #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec. #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle. #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification. Instrukce lze uchovat ve standardizovaném souboru #strong[`AGENTS.md`] @agents-md přímo v repozitáři (Anthropic ojedinele využívá #strong[CLAUDE.md]). Skilly, scripty a hooky lze uchovat pod složkou #strong[`.agents/`] v projektu nebo v konfigurační složce harnessu.

Tato dělenba má přímý důsledek pro praxi. Oprávnění udělená nástroji a rozsah zadání se dají omezovat nezávisle: lze agentovi odebrat právo měnit cokoliv mimo vyjmenované soubory, aniž by se změnil úkol, a lze zúžit úkol, aniž by mu přibyla schopnost. Kontrola, která by tyto dvě roviny zaměnila, by pak nedokázala říct, zda selhal úkol, nebo oprávnění.


#heading(level: 3)[Orchestrace a lidská integrace]

Pokud mají podúlohy jasné hranice a jejich výsledky lze znovu integrovat, rozsáhlou úlohu lze rozdělit do více agentních běhů. Ve vzoru #strong[coordinator/subagent] koordinátor deleguje dílčí úkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek. Nezávislé podúlohy mohou zpracovat paralelní pracovníci. #strong[Workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration. #strong[Agent Swarm] dynamicky rozkládá úlohu na heterogenní podproblémy a spouští specializované agenty paralelně pod řízením orchestrátoru @kimi-k25-swarm.

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol. Orchestrace je však nezbytná právě pro rozsáhlé úlohy, které se do jednoho kontextového okna nevejdou. Spoléhat se v takovém případě na kompakci by vedlo k tomu, že se ztrácí kontext, na kterém celé zadání stojí, a agent by navíc nebyl schopen pracovat na jednotlivých částech, které na sebe bezprostředně navazují.

#strong[Goal loop] označuje nadřazenou řídicí smyčku: po dílčím dokončení ReAct smyčky harness porovná pozorovaný stav s cílem a podmínkami přijetí a podle výsledku běh ukončí, nebo zahájí další iteraci či změnu strategie. @yao2022.

#strong[human-in-the-loop] (#strong[HITL]) označuje bod kde se do automatizované smyčky doplní kontrolní brány, v nichž je vyžadováno explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.
