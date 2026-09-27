// 2.2 Agent and harness.
//
// The three-step progression and the model/harness distinction are stated once, in the
// introduction, because they are the reader's first contact with both. What is left here is
// the harness itself: what it gives the model, how it is bounded, and what it lets the agent
// do — the three subsections.
#heading(level: 2)[Agent: model a harness]

#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] zahrnuje pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

#strong[Kompakce] (#emph[compaction]) po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.


#heading(level: 3)[Smyčka (Agent Loop)]

Základním mechanismem agentického systému je #strong[agentní smyčka], tedy konkrétní implementace
vzoru #strong[ReAct] (#emph[Reasoning and Acting]) @yao2022 v daném harnessu: model střídá uvažování
s akcí a harness mezi jednotlivými kroky vrací pozorování, čímž z jednotité generace vzniká
souvislá konverzace @anthropic2024tooluse. V každém kroku model nejprve zdůvodní, co hodlá
udělat, a vyjádří to jako požadavek na nástroj. Harness akci provede v běhovém prostředí a
výsledek vrátí modelu jako pozorování; to se připojí k přepisu konverzace a cyklus se opakuje.
Smyčka končí teprve tehdy, když model místo dalšího požadavku na nástroj vydá závěrečnou
odpověď. Právě tím se smyčka liší od prosté posloupnosti promptů, v níž by model nemohl
poznat, zda předchozí krok vůbec uspěl; průběh shrnuje @fig-react-loop.

#figure(
  image("/components/img/react-loop.svg", width: 100%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji provede v běhovém prostředí a pozorování se vrací do dalšího kroku. Ukončení nastává, když model místo další akce vydá závěrečnou odpověď @yao2022.],
) <fig-react-loop>


#heading(level: 3)[Dovednosti a nástroje (Skills & Tools)]

Zadání určuje, co má agent udělat; co mu je dovoleno udělat, určuje harness. Jde o dvě roviny, které se dají měnit nezávisle, a odpovídají běžnému výčtu součástí harnessu @langchain-harness:

- #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy.
- #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec.
- #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle.
- #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification.

Tato dělba má přímý důsledek pro praxi. Oprávnění udělená nástroji a rozsah zadání se dají omezovat nezávisle: lze agentovi odebrat právo měnit cokoli mimo vyjmenované soubory, aniž by se změnil úkol, a lze zúžit úkol, aniž by mu přibyla schopnost. Kontrola, která by tyto dvě roviny zaměnila, by pak nedokázala říct, zda selhal úkol, nebo oprávnění.
