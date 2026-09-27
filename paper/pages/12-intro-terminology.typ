// 1.2 Terminology.
//
// The glossary carries the vocabulary of the whole work: the one lexical rule for
// agent/agentic, and then every English term the paper uses, with the meaning it has in
// the sources. The theory chapters therefore do not define terms, they use them and argue
// with them, and they keep only the definitions that carry the thesis itself.
#heading(level: 2)[Terminologie] <terminologie>

Jedno pravidlo řídí překlad anglických výrazů v této práci. Co anglicky nazývá
#strong[agent], je česky #strong[agentní] — agent, agentní krok, agentní smyčka. Co anglicky
nazývá #strong[agentic], je česky #strong[agentické] — agentický systém, agentické
inženýrství. Podstatné jméno #strong[agent] se tedy nepřekládá, protože označuje samotného
jednajícího, zatímco přípona #strong[-ic] znamená majícího schopnost jednat, nikoli
jednajícího @mw-agentic. Podle téhož pravidla je #emph[Agent Loop] česky
#emph[agentní smyčka], protože jde o smyčku agenta, a nikoli o vlastnost systému. Výraz
#strong[Agentic Engineering] je česky #emph[agentické inženýrství]: soubor postupů, jimiž se
staví systémy schopné jednat, nikoli stavba samotných agentů @willison-agentic-engineering.

Zbytek práce ponechává v angličtině pojmy, které tak označuje obor. Český ekvivalent u nich
není jednoznačný, a překlad by čtenáře nutil odhadovat, co termín znamená, místo aby si jeho
význam mohl ověřit v téže podobě, v jaké jej používá zdroj. Následující výčet slouží jako
slovník práce: uvádí význam pojmu v podobě zdrojů, nikoli jako jejich argumentaci. Pojmy
spojené s repozitářem mají vlastní názvy v uživatelském rozhraní GitHubu a jsou přebírány
odtud.

#heading(level: 3)[Model a jeho běh]

- #strong[jazykový model] (#strong[LLM]): model, který na základě kontextu předpovídá další
  token.
- #strong[token]: nejmenší jednotka textu, kterou model zpracovává a kterou také produkuje.
- #strong[kontext]: všechno, co je modelu předloženo před daným krokem.
- #strong[kontextové okno] (#strong[context window]): horní mez množství kontextu, které model
  zpracuje v jednom volání.
- #strong[inference]: běh modelu, při němž zpracovává kontext a vytváří výstupní tokeny.
- #strong[embedding]: vektorová reprezentace slova, která zachycuje sémantické vztahy
  @mikolov2013linguistic.
- #strong[attention]: mechanismus, který stojí za architekturou #strong[Transformer] a váží
  vztahy mezi tokeny navzájem @vaswani2017.
- #strong[prompt]: instrukce předaná modelu, včetně omezení, příkladů a očekávaného výstupu
  @openai-prompt-engineering.
- #strong[spec-first] a #strong[spec-driven development]: postup, v němž specifikace vzniká
  před implementací a slouží jako její měřitelná hranice.
- #strong[kompakce]: přeformulování kontextu na kratší, aniž by se ztratilo, co zadání
  potřebuje @anthropic-context-engineering.
- #strong[scaffold]: pevná konvence výstupu, podle níž se model řídí.

#heading(level: 3)[Agent a harness]

- #strong[agent]: model používající harness; odlišuje se tak od samotného modelu
  @langchain-harness.
- #strong[agentní krok]: jedno volání modelu s jeho nástroji.
- #strong[agentní smyčka] (#strong[Agent Loop]): cyklické střídání kroku a pozorování stavu
  @yao2022.
- #strong[ReAct]: smyčka, v níž model střídává navržení akce a pozorování jejího výsledku.
- #strong[harness]: všechen kód, konfigurace a vykonávací logika, která modelu umožňuje
  jednat, a není samotným modelem @langchain-harness.
- #strong[nástroj] (#strong[tool]): opravnění agenta číst soubory, vyhledávat nebo spouštět
  příkazy.
- #strong[skills]: opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy
  @agentskills-spec.
- #strong[hooks]: reakce na události životního cyklu, schopné před akcí či po ní vynutit
  kontrolu @openai-agents-lifecycle.
- #strong[middleware]: kód zapisovaný mezi výzvou modelu a jeho nástrojem.
- #strong[Model Context Protocol] (#strong[MCP]): rozhraní klient–server pro napojení
  externích nástrojů a datových zdrojů @mcp-specification.
- #strong[`AGENTS.md`]: standardizovaný soubor s instrukcemi pro agenta, uložený v repozitáři
  @agents-md.
- #strong[subagent]: specializovaný agent se vlastním kontextem, jemuž koordinátor zadá
  dílčí úkol.
- #strong[coordinator/subagent]: vzor, v němž koordinátor deleguje a přebírá výsledek.
- #strong[sandbox]: izolované prostředí, v němž agent pracuje.
- #strong[runner]: vrstva, která agenta spouští, dohlíží na něj a zapisuje jeho kroky.
- #strong[diff]: rozdíl mezi stavem větve před zásahem a po něm.

#heading(level: 3)[Řízení běhu]

- #strong[workflow]: práce rozdělená na dílčí kroky, které na sebe navazují
  @anthropic-dynamic-workflows.
- #strong[workflow graph]: popis závislostí, pořadí a větvení fází takto rozdělené práce
  @openai-agent-orchestration.
- #strong[dynamické workflow]: workflow, jehož plán je skript vykonávaný na pozadí, takže
  smyčku a mezivýsledky drží skript, nikoli kontext modelu @anthropic-dynamic-workflows.
- #strong[agent swarm]: rozklad úlohy na heterogenní podproblémy spuštěné paralelně pod
  řízením orchestrátoru @kimi-k25-swarm.
- #strong[goal loop]: nadřazená smyčka, která po dokončení dílčího kroku porovná stav s cílem
  a podmínkami přijetí @openai-goals.
- #strong[Ralph loop]: původní podoba goal loopu, smyčka, která agenta opakovaně spouští se
  stejným zadáním a stav si drží v pracovním stromu @huntley2025ralph.
- #strong[human-in-the-loop] (#strong[HITL]): bod, v němž se do automatizované smyčky doplní
  brána vyžadující explicitní lidské rozhodnutí.
- #strong[review]: automatická kontrola výsledné změny, po níž následuje oprava nebo
  zastavení.

#heading(level: 3)[Repozitář a jeho záznam]

- #strong[issue]: záznam požadavku v repozitáři; v této práci i jednotka, kterou zpracovává
  agent.
- #strong[commit]: uložený stav repozitáře s popisem změny.
- #strong[větev] (#strong[branch]): paralelní kopie repozitáře, do níž se provádějí změny.
- #strong[pull request]: návrh sloučení větve do cílové větve @github-pull-requests.
- #strong[draft]: stav pull requestu, který ještě není připraven k posouzení.
- #strong[merge]: sloučení větve schválenou větví.
- #strong[revize]: konkrétní stav repozitáře, z něhož práce vychází; odlišuje se od
  #strong[review], které je kontrolou změny.
