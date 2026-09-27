// 2.1 The language model in an agentic system.
#heading(level: 2)[Jazykový model v agentním systému] <theory-first>

Současný jazykový model stojí na architektuře #strong[Transformer], kterou představil Google v roce 2017 v jejich nyní proslulé práci „Attention Is All You Need“. Místo zpracovávání tokenů jeden po druhém přiřazuje architektura význam každému tokenu současně se všemi ostatními. Mechanismus, na kterém je architektura postavená, se nazývá #strong[attention] @vaswani2017 a je dodnes používaný i v pozdějších generacích modelů @brown2020. Díky tomu model zpracovává celý kontext najednou, což odpovídá dnešním požadavkům na délku a složitost konverzace.

Na této architektuře je založen i jazykový model (#strong[LLM]), který předpovídá další token na základě toho, co je před ním obsaženo v #strong[kontextu]. Při #strong[inferenci] model zpracuje obsah kontextového okna a vytvoří posloupnost výstupních tokenů.

Vektorové reprezentace, označované jako #strong[embeddingy], zachycují sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi vektory slov král, královna, muž a žena @mikolov2013linguistic. Tento vztah schematicky znázorňuje @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 78%),
  caption: [Ilustrace sémantického vztahu mezi vektorovými reprezentacemi slov #emph[král, královna, muž a žena] @mikolov2013linguistic.],
) <fig-embedding-queen>
