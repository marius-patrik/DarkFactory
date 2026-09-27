// 2.3 Agentic engineering.
#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) označuje soubor postupů, jimiž se vývoj softwaru pomocí coding agentů stává účinným, kontrolovaným, opakovatelným a škálovatelným @willison-agentic-engineering. Jeho předmětem není samotný agent ani jeho model, ale systém, v němž agent pracuje: zadání, omezení, nástroje, pravidla integrace a odpovědnost člověka. Odtud také jeho popis jako archetypu #strong[agentického inženýra], jehož přidanou hodnotu už netvoří psaní kódu, ale formulace zadání, řízení agentních běhů a kritické posouzení strojem vytvořených výstupů @alenezi2026agentic. Mezi hlavní oblasti patří: #strong[Prompt Engineering] @openai-prompt-engineering, #strong[Context Engineering] @anthropic-context-engineering, #strong[Harness Engineering] @anthropic-harness-design @openai-agents-sandbox, #strong[Loop Engineering] @openai-goals a #strong[Workflow/Graph Engineering] @openai-agent-orchestration. Cílem je, aby vývojář mohl efektivně a kontrolovaně delegovat dílčí úkoly agentovi, aniž by ztratil přehled o záměru, rozsahu a kvalitě výsledku.


#heading(level: 3)[Zadání a plán (Prompt & Plan)]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo #emph[spec-driven development], dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku. Přitom jde o postup používaný i v klasickém vývoji softwaru.


V praxi to znamená, že se plán nevzniká až během práce agenta, ale před ní: jeho znění se nejprve dohodnou s člověkem, zapíše do souboru a teprve potom se agent pustí do změn.

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku @openai-prompt-engineering. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @anthropic-context-engineering. 

#heading(level: 3)[Dovednosti a nástroje (Skills & Tools)]

Zadání určuje, co má agent udělat; co mu je dovoleno udělat, určuje harness. Jde o dvě roviny, které se dají měnit nezávisle, a odpovídají běžnému výčtu součástí harnessu @langchain-harness:

- #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy.
- #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec.
- #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle.
- #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification.

Tato dělba má přímý důsledek pro praxi. Oprávnění udělená nástroji a rozsah zadání se dají omezovat nezávisle: lze agentovi odebrat právo měnit cokoliv mimo vyjmenované soubory, aniž by se změnil úkol, a lze zúžit úkol, aniž by mu přibyla schopnost. Kontrola, která by tyto dvě roviny zaměnila, by pak nedokázala říct, zda selhal úkol, nebo oprávnění.


#heading(level: 3)[Orchestrace a lidská integrace (Orchestration & HITL)]

Pokud mají podúlohy jasné hranice a jejich výsledky lze znovu integrovat, rozsáhlou úlohu lze rozdělit do více agentních běhů. Ve vzoru #strong[coordinator/subagent] koordinátor deleguje dílčí úkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek. Nezávislé podúlohy mohou zpracovat paralelní pracovníci. Claude Code jde dál: u dynamických workflow Claude sepíše skript, který runtime vykonává na pozadí. Smyčku, větvení i mezivýsledky pak drží skript místo kontextu modelu, takže plán je program, který lze přečíst a znovu spustit @anthropic-dynamic-workflows.

V praxi se to projevuje v několika ustálených vzorech:
- #strong[Workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration.
- #strong[Agent Swarm] dynamicky rozkládá úlohu na heterogenní podproblémy a spouští specializované agenty paralelně pod řízením orchestrátoru @kimi-k25-swarm.
- #strong[Goal loop] je nadřazená řídicí smyčka: po dílčím dokončení ReAct smyčky se pozorovaný stav porovná s cílem a podmínkami přijetí a běh skončí, nebo pokračuje další iterací. Vzor pochází z tzv. #strong[Ralph loop], který v roce 2025 popsal Geoffrey Huntley jako smyčku, jež opakovaně spouští agenta se stejným zadáním a stav si drží v pracovním stromu, nikoli v přepisu konverzace @huntley2025ralph. Dnes je to běžná funkce Claude Code i Codexu @claude-goal @openai-goals.
- #strong[human-in-the-loop] (#strong[HITL]) označuje bod, v němž se do automatizované smyčky doplní kontrolní brány vyžadující explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.
 Vzorec koordinátor a subagent je běžně dostupný i v komerčních CLI harnessích, jak ukazuje @fig-antigravity-subagents.

#figure(
  image("/components/img/claude-code-dynamic-workflows.png", width: 100%),
  caption: [Postup práce dynamického workflow v Claude Code: vlevo fáze plánu se stavem,
  vpravo rozvinutá fáze #emph[CodeReview] se šestnácti agenty, u každého model, spotřebované
  tokeny, počet nástrojů a doba běhu. Screenshot pochází z komunitního příspěvku; rozhraní
  i jeho chování popisuje dokumentace @anthropic-dynamic-workflows.],
) <fig-dynamic-workflows>

#figure(
  image("/components/img/antigravity-cli-subagents.jpg", width: 100%),
  caption: [Rozhraní Google Antigravity CLI, tedy harnessu agenta běžícího v terminálu: koordinátor definuje tři specializované subagenty a spouští je souběžně; každý běží vlastním kontextem @antigravity-cli.],
) <fig-antigravity-subagents>


Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy, když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu a integračních kontrol. Orchestrace je však nezbytná právě pro rozsáhlé úlohy, které se do jednoho kontextového okna nevejdou. Spoléhat se v takovém případě na kompakci by vedlo k tomu, že se ztrácí kontext, na kterém celé zadání stojí, a agent by navíc nebyl schopen pracovat na jednotlivých částech, které na sebe bezprostředně navazují.
