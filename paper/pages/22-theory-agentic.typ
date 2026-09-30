// 2.3 Agentic engineering.
#heading(level: 2)[Agentické inženýrství]

V této práci se #strong[agentickým inženýrstvím] (#strong[Agentic Engineering]) rozumí soubor postupů pro návrh a řízení vývoje softwaru pomocí coding agentů. Jeho předmětem není samotný model, ale širší systém, v němž agent pracuje: zadání, kontext, nástroje, omezení, orchestrace, pravidla integrace a odpovědnost člověka. Tomu odpovídá i popis role #strong[agentického inženýra], jehož práce se vedle samotného kódu přesouvá k formulaci zadání, řízení agentních běhů a kritickému posouzení strojem vytvořených výstupů @alenezi2026agentic. Mezi hlavní oblasti patří #strong[Prompt engineering] @openai-prompt-engineering, #strong[Context engineering] @anthropic-context-engineering, #strong[Harness engineering] @anthropic-harness-design @openai-agents-sandbox, #strong[Loop Engineering] @openai-goals a #strong[Workflow/Graph Engineering] @openai-agent-orchestration. Tyto postupy umožňují delegovat ohraničenou část vývojové práce agentovi, zatímco záměr, hranice procesu a integrace výsledku zůstávají explicitně řízené.

#heading(level: 3)[Specifikace (Specification)]

#strong[Spec-first development] staví specifikaci před samotnou implementaci. Tento princip nevznikl s coding agenty; navazuje na dlouhodobou praxi #strong[requirements engineering], v níž jsou požadavky a očekávané vlastnosti systému popsány před nebo v průběhu jeho realizace. IEEE vydalo samostatný standard pro #emph[Software Requirements Specification] už v roce 1984 @ieee830-1984 a současný standard ISO/IEC/IEEE 29148 formalizuje procesy a výstupy requirements engineering v průběhu životního cyklu softwaru @iso29148-2018.

U coding agentů získává tento přístup nový význam. Specifikace už neslouží pouze jako podklad pro lidského vývojáře, ale může být přímo předána agentovi jako vymezení cíle, požadavků a omezení implementace. Čím samostatněji má agent pracovat, tím důležitější je, aby bylo před zahájením implementace dostatečně přesně určeno, #strong[co má být výsledkem], zatímco konkrétní postup může agent zvolit sám.

#figure(
  image("/components/img/claude-code-plan.png", width: 100%),
  caption: [Plán, který model navrhne, než se začne psát kód: seznam kroků podle souborů, které se
  mění, a otázka, zda se má pokračovat. Znění plánu je tak oddělené od jeho provádění — je to
  rozhodnutí, které člověk schvaluje nebo odmítne, nikoli popis práce, která už běží. Snímek
  z Claude Code, převzato z @gallardo2025beyond.],
) <fig-claude-code-plan>

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku @openai-prompt-engineering. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @anthropic-context-engineering. 

#heading(level: 3)[Orchestrace (Orchestration)]

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy,
když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí
výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto
zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdílený stav
a integrační kontroly. Je nezbytná právě pro rozsáhlé úlohy, které se do jednoho kontextového
okna nevejdou: spoléhat se tam na kompakci by znamenalo ztratit kontext, na kterém celé zadání
stojí, a agent by navíc nebyl schopen pracovat na částech, které na sebe bezprostředně
navazují. Čtyři vzorce na to odpovídají:

- #strong[Coordinator/subagent] rozdělí rozsáhlou úlohu na dílčí běhy. Koordinátor deleguje
  podúkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek, nezávislé
  podúlohy zpracují paralelní pracovníci.

#figure(
  image("/components/img/antigravity-cli-subagents.jpg", width: 100%),
  caption: [Rozhraní Google Antigravity CLI, tedy harnessu agenta běžícího v terminálu: koordinátor definuje tři specializované subagenty a spouští je souběžně; každý běží vlastním kontextem @antigravity-cli.],
) <fig-antigravity-subagents>

- #strong[Workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration.
  Claude Code u dynamických workflow napíše skript, který runtime vykonává na pozadí, takže smyčku,
  větvení i mezivýsledky drží skript místo kontextu modelu a plán je program, který lze přečíst
  a znovu spustit @anthropic-dynamic-workflows.

#figure(
  image("/components/img/claude-code-dynamic-workflows.png", width: 100%),
  caption: [Postup práce dynamického workflow v Claude Code: vlevo fáze plánu se stavem,
  vpravo rozvinutá fáze #emph[CodeReview] se 16 agenty, u každého model, spotřebované
  tokeny, počet nástrojů a doba běhu. Snímek pochází z komunitního příspěvku; rozhraní
  i jeho chování popisuje dokumentace @anthropic-dynamic-workflows.],
) <fig-dynamic-workflows>

- #strong[Goal loop] je nadřazená řídicí smyčka. Po dílčím dokončení ReAct smyčky se pozorovaný stav porovná s cílem a podmínkami přijetí a běh skončí, nebo pokračuje další iterací. Vzor pochází z tzv. #strong[Ralph loop], který v roce 2025 popsal Geoffrey Huntley jako smyčku, jež opakovaně spouští agenta se stejným zadáním a stav si drží v pracovním stromu, nikoli v přepisu konverzace @huntley2025ralph. Dnes je to běžná funkce Claude Code i Codexu @claude-goal @openai-goals.

#figure(
  image("/components/img/codex-goal-complete.png", width: 100%),
  caption: [Cíl, proti němuž agent postupuje, a jeho splnění: po dokončení dílčího kroku se stav
  porovná s cílem a běh v tomto případě končí, včetně doby, kterou zabral. Snímek pochází
  z komunitního příspěvku; funkci popisuje dokumentace @openai-goals.],
) <fig-codex-goal>

- #strong[human-in-the-loop] (#strong[HITL]) označuje bod, v němž se automatizovaná smyčka doplní o kontrolní brány vyžadující explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.
