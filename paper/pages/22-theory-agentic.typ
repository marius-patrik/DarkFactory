// 2.3 Agentic engineering.
#heading(level: 2)[Agentické inženýrství]

Agentické inženýrství (#strong[Agentic Engineering]) označuje soubor postupů, jimiž se vývoj softwaru pomocí coding agentů stává účinným, kontrolovaným, opakovatelným a škálovatelným @willison-agentic-engineering. Jeho předmětem není samotný agent ani jeho model, ale systém, v němž agent pracuje: zadání, omezení, nástroje, pravidla integrace a odpovědnost člověka. Odtud také jeho popis jako archetypu #strong[agentického inženýra], jehož přidanou hodnotu už netvoří psaní kódu, ale formulace zadání, řízení agentních běhů a kritické posouzení strojem vytvořených výstupů @alenezi2026agentic. Mezi hlavní oblasti patří: #strong[Prompt engineering] @openai-prompt-engineering, #strong[Context engineering] @anthropic-context-engineering, #strong[Harness engineering] @anthropic-harness-design @openai-agents-sandbox, #strong[Loop Engineering] @openai-goals a #strong[Workflow/Graph Engineering] @openai-agent-orchestration. Cílem je, aby vývojář mohl efektivně a kontrolovaně delegovat dílčí úkoly agentovi, aniž by ztratil přehled o záměru, rozsahu a kvalitě výsledku.

#heading(level: 3)[Zadání a plán (Prompt & Plan)]

Spolehlivé delegování práce začíná explicitním vymezením cíle, rozsahu, omezení a podmínek přijetí. Specifikace popisuje nejen požadovaný výsledek, ale také části systému, které se měnit nemají, a způsob, jakým bude výsledek ověřen. Tento přístup, označovaný jako #strong[spec-first] nebo #emph[spec-driven development], dává agentovi před implementací měřitelné hranice a člověku podklad pro posouzení výsledku. Přitom jde o postup používaný i v klasickém vývoji softwaru.

V praxi to znamená, že se plán nevzniká až během práce agenta, ale před ní: jeho znění se nejprve dohodnou s člověkem, zapíše do souboru a teprve potom se agent pustí do změn.

#figure(
  image("/components/img/claude-code-plan.png", width: 100%),
  caption: [Plán, který model navrhne, než se začne psát kód: seznam kroků podle souborů, které se
  mění, a otázka, zda se má pokračovat. Znění plánu je tak oddělené od jeho provádění — je to
  rozhodnutí, které člověk schvaluje nebo odmítne, nikoli popis práce, která už běží. Screenshot
  z Claude Code, převzato z @gallardo2025beyond.],
) <fig-claude-code-plan>

#strong[Prompt engineering] se soustředí na formulaci instrukcí, omezení, příkladů a očekávaného výstupu konkrétního inferenčního kroku @openai-prompt-engineering. #strong[Context engineering] řeší širší a průběžný výběr, uspořádání, obnovování a kompakci informací, které má model v daném kroku k dispozici @anthropic-context-engineering. 

#heading(level: 3)[Orchestrace a lidská integrace (Orchestration & HITL)]

Více agentů samo o sobě nezaručuje lepší výsledek. Paralelizace přináší užitek jen tehdy,
když jsou omezeny vzájemné závislosti a koordinátor dokáže odhalit konflikty, ověřit dílčí
výstupy a posoudit sloučený výsledek vůči společným podmínkám přijetí. Orchestrace proto
zahrnuje nejen rozdělení práce, ale také správu kontextu, pořadí kroků, sdíleného stavu
a integračních kontrol. Je nezbytná právě pro rozsáhlé úlohy, které se do jednoho kontextového
okna nevejdou: spoléhat se tam na kompakci by znamenalo ztratit kontext, na kterém celé zadání
stojí, a agent by navíc nebyl schopen pracovat na částech, které na sebe bezprostředně
navazují. Čtyři vzorce na to odpovídají:

- #strong[Coordinator/subagent] rozdělí rozsáhlou úlohu na dílčí běhy: koordinátor deleguje
  podúkol specializovanému subagentovi s vlastním kontextem a přebírá jeho výsledek, nezávislé
  podúlohy zpracují paralelní pracovníci.

#figure(
  image("/components/img/antigravity-cli-subagents.jpg", width: 100%),
  caption: [Rozhraní Google Antigravity CLI, tedy harnessu agenta běžícího v terminálu: koordinátor definuje tři specializované subagenty a spouští je souběžně; každý běží vlastním kontextem @antigravity-cli.],
) <fig-antigravity-subagents>

- #strong[Workflow graph] předem určuje závislosti, pořadí a větvení fází @openai-agent-orchestration.
  Kimi je jeden způsob, jak takový graf sestavit: místo pevného pořadí rozkládá úlohu na podproblémy
  až za běhu a každému dá vlastního agenta @kimi-k25-swarm. Claude Code jde dál: u dynamických
  workflow napíše skript, který runtime vykonává na pozadí, takže smyčku, větvení i mezivýsledky
  drží skript místo kontextu modelu a plán je program, který lze přečíst a znovu spustit
  @anthropic-dynamic-workflows.

#figure(
  image("/components/img/claude-code-dynamic-workflows.png", width: 100%),
  caption: [Postup práce dynamického workflow v Claude Code: vlevo fáze plánu se stavem,
  vpravo rozvinutá fáze #emph[CodeReview] se šestnácti agenty, u každého model, spotřebované
  tokeny, počet nástrojů a doba běhu. Screenshot pochází z komunitního příspěvku; rozhraní
  i jeho chování popisuje dokumentace @anthropic-dynamic-workflows.],
) <fig-dynamic-workflows>

- #strong[Goal loop] je nadřazená řídicí smyčka: po dílčím dokončení ReAct smyčky se pozorovaný stav porovná s cílem a podmínkami přijetí a běh skončí, nebo pokračuje další iterací. Vzor pochází z tzv. #strong[Ralph loop], který v roce 2025 popsal Geoffrey Huntley jako smyčku, jež opakovaně spouští agenta se stejným zadáním a stav si drží v pracovním stromu, nikoli v přepisu konverzace @huntley2025ralph. Dnes je to běžná funkce Claude Code i Codexu @claude-goal @openai-goals. Zásadní přitom je, že nejde o jediný pokus: agent dostává zpět to, co jeho krok vyrobil,
  a může podle toho postup změnit. Spolehlivost tu nevzniká z modelu, ale z toho, že se chyba stane
  součástí dalšího kroku.

#figure(
  image("/components/img/codex-goal-complete.png", width: 100%),
  caption: [Cíl, proti němuž agent postupuje, a jeho splnění: po dokončení dílčího kroku se stav
  porovná s cílem a běh v tomto případě končí, včetně doby, kterou zabral. Screenshot pochází
  z komunitního příspěvku; funkci popisuje dokumentace @openai-goals.],
) <fig-codex-goal>

- #strong[human-in-the-loop] (#strong[HITL]) označuje bod, v němž se do automatizované smyčky doplní kontrolní brány vyžadující explicitní lidské rozhodnutí, například schválení specifikace, potvrzení implementačního plánu nebo přijetí výsledného diffu. Vývojář tak může ponechat agentovi ohraničenou implementační práci a současně si zachovat odpovědnost za záměr a integraci.
