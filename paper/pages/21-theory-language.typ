// 2.1 The language model in an agentic system.
#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Současný jazykový model stojí na jedné architektuře. V roce 2017 představili výzkumníci Googlu v příspěvku *Attention Is All You Need* novou neuronovou architekturu #strong[Transformer], která místo zpracovávání tokenů jeden po druhém přiřazuje význam každému tokenu současně se všemi ostatními. Mechanismus, který to umožňuje, se nazývá #strong[attention] @vaswani2017 a je dodnes používaný i v pozdějších generacích modelů @brown2020. Právě tato schopnost zpracovat celý kontext najednou je to, co umožňuje dnešní požadavky na délku a složitost konverzace.

Na této architektuře je založen i jazykový model (#strong[LLM]), který předpovídá další token na základě toho, co je před ním obsaženo v #strong[kontextu]. Při #strong[inferenci] model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů. Samotná #strong[Inference] však nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje a pomocí rekursivního procesu zvaného ReAct @yao2022 dělá z jednotné generace souvislou konverzaci @anthropic2024tooluse.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena @mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 78%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov *král, královna, muž a žena* @mikolov2013linguistic.],
) <fig-embedding-queen>


#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] (*context window*) tvoří pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

Kompakce (*compaction*) po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.
