// 2.1 What an agent is and how it works.
//
// The model and the harness are one subject, not two: the harness is what turns a model
// into something that acts, so splitting them left the reader with a definition and then a
// set of mechanisms with no link between them. The model comes first, then its context,
// then the loop it runs in, then what it is allowed to do with.
//
// The three-step progression and the line between a chatbot and an agent are stated once,
// in the introduction, and are not repeated here.
#heading(level: 2)[Agent: Co to je a jak funguje] <theory-first>

Současný jazykový model stojí na architektuře #strong[Transformer], kterou představil Google v roce 2017 v jejich nyní proslulé práci #strong[#emph[„Attention Is All You Need“]] @vaswani2017. Místo zpracovávání tokenů jeden po druhém přiřazuje architektura význam každému tokenu současně se všemi ostatními. Mechanismus, na kterém je architektura postavená, se nazývá #strong[attention] a je dodnes používaný i v pozdějších generacích modelů @brown2020. Přitom ke každému tokenu připočítá vážený součet hodnot ostatních tokenů, takže jeho reprezentace nese informaci z celého kontextu a vzdálenost mezi pozicemi nemusí být pevně daná jejich pořadím. Právě to dovoluje zpracovat kontext najednou a vyhovět dnešním požadavkům na délku a složitost konverzace.

Na této architektuře je založen i jazykový model (#strong[LLM]), který předpovídá další token na základě toho, co je před ním obsaženo v #strong[kontextu]. Při #strong[inferenci] model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy v prostoru vektorů. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena @mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov #emph[král, královna, muž a žena] @mikolov2013linguistic.],
) <fig-embedding-queen>


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
  caption: [Agentní smyčka ReAct: model střídá uvažování s akcí, akci provádí harness mimo model a pozorování se vrací do kontextu. Smyčka končí, když model místo další akce vydá závěrečnou odpověď @yao2022.],
) <fig-react-loop>


#heading(level: 3)[Dovednosti a nástroje (Skills & Tools)]

Zadání určuje, co má agent udělat; co mu je dovoleno udělat, určuje harness. Jde o dvě roviny, které se dají měnit nezávisle, a odpovídají běžnému výčtu součástí harnessu @langchain-harness:

- #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět příkazy.
- #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy @agentskills-spec.
- #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit deterministickou kontrolu @openai-agents-lifecycle.
- #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification.

Instrukce lze uchovat ve standardizovaném souboru #strong[`AGENTS.md`] @agents-md přímo v repozitáři (Anthropic ojedinele využívá #strong[CLAUDE.md]). Skilly, scripty a hooky lze uchovat pod složkou #strong[`.agents/`] v projektu nebo v konfigurační složce harnessu.

Tato dělba má přímý důsledek pro praxi. Oprávnění udělená nástroji a rozsah zadání se dají omezovat nezávisle: lze agentovi odebrat právo měnit cokoli mimo vyjmenované soubory, aniž by se změnil úkol, a lze zúžit úkol, aniž by mu přibyla schopnost. Kontrola, která by tyto dvě roviny zaměnila, by pak nedokázala říct, zda selhal úkol, nebo oprávnění.
