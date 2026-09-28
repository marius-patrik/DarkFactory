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

#strong[Agent je model plus harness] @langchain-harness: model navrhuje a harness mu
dopředuje kontext, nástroje a pravidla, jejichž prostřednictvím se návrh mění v čin.
Celý systém tvoří několik vrstev — rozhraní, smyčka agenta, oprávnění, nástroje, uložený stav
a prostředí, v němž běží — a model je jen jedna z nich. Spolehlivost agenta proto neurčuje
samotný model, ale skladba těch vrstev; a čím jsou modely schopnější, tím větší část práce
přebírá tato skladba, ne model.

#heading(level: 3)[Jazykový model (LLM)]

Současný jazykový model stojí na architektuře #strong[Transformer], kterou představil Google
v roce 2017 v jejich nyní proslulé práci #strong[#emph[„Attention Is All You Need“]] @vaswani2017.
Místo zpracovávání tokenů jeden po druhém přiřazuje architektura význam každému tokenu
současně se všemi ostatními.

Mechanismus, na kterém je architektura postavená, se nazývá #strong[attention]. Ke každému
tokenu připočítá vážený součet hodnot ostatních tokenů, takže jeho reprezentace nese
informaci z celého kontextu a vzdálenost mezi pozicemi nemusí být pevně daná jejich
pořadím. Právě to dovoluje zpracovat kontext najednou a vyhovět dnešním požadavkům na délku
a složitost konverzace; mechanismus je používaný i v pozdějších generacích modelů
@brown2020.

Jazykový model je sám o sobě jen funkce. Na základě toho, co dostane v kontextu, vypočítá
rozložení pravděpodobností nad následujícím tokenem a jeden z nich vybere. Mezi voláními si
nic nepamatuje, nezná nic mimo text, který mu byl předložen, a nemá přístup k souborům,
příkazům ani stavu práce. Všechno, co o zadání ví, je v kontextu, a jinudy se to do něj
nedostane.

Při #strong[inferenci] tedy model zpracuje obsah kontextového okna a vytváří výstupní tokeny
jeden za druhým, přičemž každý nový token se stane součástí kontextu pro další krok. To je
celá jeho schopnost: převést kontext na posloupnost tokenů. Stav mezi kroky, nástroje,
ukládání výsledků a oprávnění musí přijít zvenčí — a to je právě to, co doplňuje harness.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy
v prostoru vektorů. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena
@mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 100%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov #emph[král, královna, muž a žena] @mikolov2013linguistic.],
) <fig-embedding-queen>


#heading(level: 3)[Smyčka agenta (Agent Loop)]

Základním mechanismem agentického systému je #strong[agentní smyčka]: konkrétní implementace
vzoru #strong[ReAct] (#emph[Reasoning and Acting]) @yao2022 v daném harnessu. Jeden cyklus má
pět kroků:

- sestavit kontext: systémové pokyny, dosavadní přepis, stav prostředí;
- nechat model odpovědět;
- je-li v odpovědi požadavek na nástroj, provést jej;
- zapsat výsledek nástroje jako pozorování;
- vrátit se na první krok.

Model přitom v každém cyklu nejprve zdůvodní, co udělá, a teprve pak žádá o nástroj
@anthropic2024tooluse. Harness akci provede mimo model a výsledek mu vrátí; ten se připojí
k přepisu a cyklus běží dál. Smyčka končí teprve tehdy, když model místo požadavku na
nástroj vydá závěrečnou odpověď. V prosté posloupnosti promptů by model nemohl poznat, zda
předchozí krok uspěl; průběh shrnuje @fig-react-loop.

#figure(
  image("/components/img/react-loop.svg", width: 100%),
  caption: [Vzor ReAct: myšlenka, akce a pozorování se střídají a každý z nich se připojí do
  kontextu, takže smyčka pokračuje na tom, co už model viděl. Končí odpovědí místo dalšího
  požadavku na nástroj @yao2022.],
) <fig-react-loop>

V konkrétní implementaci se tato trajektorie skládá do jednoho kontextového okna, a tam začínají
náklady. Výsledky starších nástrojů se z přepisu vyčistí a při dosažení hranice okna se přepis
nahradí souhrnem @anthropic-context-engineering; rozhodující je, co v něm zůstane. Živé
zpracování jednoho běhu v Claude Code shrnuje @fig-claude-code-context.

#figure(
  image("/components/img/claude-code-context-lifecycle.svg", width: 100%),
  caption: [Kontextové okno v Claude Code: systémový prompt, nástroje a zadání zůstávají, zatímco
  myšlenky, volání nástrojů a jejich výsledky se vrší. Když okno dojde k hranici, kompakce nahradí
  přepis souhrnem a běh pokračuje s ním a s pěti naposledy otevřenými soubory. Vedle toho běží tři
  věci: výsledky starších nástrojů se čistí, poznámky se ukládají mimo okno a obsah souborů se
  načítá až tehdy, když je agent potřebuje @anthropic-context-engineering.],
) <fig-claude-code-context>


#heading(level: 3)[Nástroje, oprávnění a paměť (Tools, Permissions & Memory)]

Zadání určuje, co má agent udělat; co mu je dovoleno udělat, určuje harness. Jde o dvě
roviny, které se dají měnit nezávisle, a odpovídají běžnému výčtu součástí harnessu
@langchain-harness:

- #strong[Nástroje] umožňují agentovi číst a upravovat soubory, vyhledávat nebo spouštět
  příkazy. Než se nástroj spustí, harness jeho vstup ověří proti předepsanému schématu, takže
  chybný požadavek se neprovede.
- #strong[Skills] spojují opakovaně použitelné instrukce, skripty a zdroje pro určitý typ úlohy
  @agentskills-spec.
- #strong[Hooks] reagují na události životního cyklu a mohou před akcí či po ní vynutit kontrolu
  @openai-agents-lifecycle.
- #strong[Model Context Protocol] (#strong[MCP]) standardizuje napojení externích nástrojů a
  datových zdrojů prostřednictvím rozhraní klient--server @mcp-specification.

Každá akce ještě předtím projde oprávněním, které pro ni platí: provést automaticky, zeptat se
člověka, nebo zakázat. Ani když model navrhne něco nebezpečného, dostane se to k provedení jen
tehdy, když to oprávnění dovolí.

Instrukce pro agenta leží v repozitáři, standardně v souboru #strong[`AGENTS.md`] @agents-md
(u Anthropicu v #strong[`CLAUDE.md`]). Takový soubor může existovat v několika úrovních — v kořeni
projektu, ve složce i v jednotlivých podadresářích — a harness si načte jen ten, který se týká
právě otevřených souborů. Skilly, scripty a hooky leží pod složkou #strong[`.agents/`].

Oprávnění a rozsah zadání se dají omezovat nezávisle: agentovi lze odebrat právo měnit cokoli
mimo vyjmenované soubory, aniž by se změnil úkol, a úkol lze zúžit, aniž by mu přibyla
schopnost. Kontrola, která by tyto dvě roviny zaměnila, by pak nevěděla, zda selhal úkol, nebo
oprávnění.


#heading(level: 3)[Kontextové okno a kompakce]

#strong[Kontextové okno] zahrnuje pracovní kontext jednoho volání modelu: instrukce, části
repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita sama o sobě
nezaručuje, že model všechny podstatné informace správně využije — úspěšnost jejich vybavení
závisí také na umístění a s rostoucí délkou vstupu klesá @liu2024. Toto zhoršování práce s
nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

#strong[Kompakce] (#emph[compaction]) po překročení limitu nahradí starší průběh souhrnem
rozhodnutí a výsledků, takže do dalšího volání není nutné vkládat celý přepis
@anthropic-context-engineering.

Opakující se část kontextu — systémové pokyny a popisy nástrojů — se mezi kroky neposílá
znovu, ale vrací se z mezipaměti. Model tím vidí totéž; ušetří se jen peníze a čas.

Paměť má zpravidla vlastní způsoby, jak se zkazit: zastaralé instrukce, které nikdo neupraví,
spory mezi soubory na různých úrovních, příliš mnoho nepodstatného a pravidla, která se postupně
posouvají, aniž by je někdo schválil. Kompakce musí přežít sama sebe — když v souhrnu zůstane
jen to, co bylo napsáno naposledy, agent ztratí to, na čem stála celá práce.
