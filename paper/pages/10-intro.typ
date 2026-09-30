// Chapter 1, including 1.1 Aim, research question, hypothesis and scope.
//
// The introduction carries no unheaded survey of the literature; the qualification of
// sources — what kind of text each is, its review status, and who stands behind it —
// is stated once here, in the paragraph that sorts them, so that the theory chapter can
// attribute individual sentences without repeating itself. The subsections are fixed by
// the structure of the work: 1.1 Motivace, 1.2 Cíl a výzkumná otázka, 1.3 Terminologie.
//
// 1.2 is also where the three principles are to be stated, once, if Q-A in ../STATE.md is settled
// that way. It must not become a term list: 1.3 owns terminology and is one paragraph.
#heading(level: 1)[Úvod]

#heading(level: 2)[Motivace: Vývoj a adopce generativní AI] <motivace>

Od svého vzniku se nástroje založené na jazykových modelech neustále zlepšují a roste také jejich adopce. Jednou z prvních široce používaných forem ve vývoji softwaru bylo doplňování kódu přímo v editoru @github-copilot-completion.

#figure(
  image("/components/img/vscode-copilot-inline-suggestions.png", width: 100%),
  caption: [Doplňování kódu přímo v editoru: model navrhuje pokračování řádku, které člověk
  přijme nebo odmítne @github-copilot-completion.],
) <fig-copilot-inline>

Potom přišly konverzační chatboty, v nichž model sestavuje odpověď, ale
nástroje mu zpravidla nebyly k dispozici, takže i nadále všechno provedl uživatel.

#figure(
  image("/components/img/chatgpt-cannot-see-image.jpg", width: 100%),
  caption: [Chatbot odpovídá textem a práci nechává člověku: místo aby snímek posoudil, přizná,
  že obrázky neumí, a je to uživatel, kdo musí dojít k závěru. Snímek z bezplatné verze
  ChatGPT, převzato z @khurana2023chatgpt.],
) <fig-chatgpt-cannot-see>

Další posun představují #emph[agenti] @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026,
kteří mohou získat přístup k souborům, příkazům a běhovému prostředí. Model tak už pouze nenavrhuje výsledek, ale může prostřednictvím nástrojů sám provádět jednotlivé kroky práce.

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu @gradually-ai-usage-2026.]
) <fig-gradually-usage>

Podle jednoho zveřejněného odhadu používá bezplatné AI chatboty přibližně 28~% světové populace, zatímco pravidelní uživatelé coding agentů tvoří přibližně 0,36~% @gradually-ai-usage-2026 @fig-gradually-usage. Agentické nástroje jsou tedy stále výrazně méně rozšířené než běžné konverzační použití generativní AI. Motivací této práce je proto ukázat, čeho lze s těmito nástroji dosáhnout při použití současných postupů agentického inženýrství.

#heading(level: 2)[Cíl, výzkumná otázka, hypotéza a vymezení] <intro-goal>

Cílem práce je popsat a systematizovat principy současného agentického inženýrství ve vývoji softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi.

Výzkumná otázka pak zní: #emph[Jaké architektonické a procesní principy se opakují v současném agentickém vývoji softwaru a jak jsou realizovány v systému DarkFactory?]

Práce vychází z předpokladu, že v analyzovaných současných systémech a zdrojích se opakuje vzor, ve kterém jazykový model je součástí širšího systému, který zajišťuje kontext, nástroje, trvalý stav, orchestraci, ověřování a lidské rozhodovací body.

Praktická část má podobu inženýrské případové studie systému DarkFactory. Nejde o experimentální měření úspěšnosti modelu, ale o systematický popis a kritické zhodnocení toho, jak jsou uvedené principy spojeny v jednom konkrétním produkčním systému.

Rozsah práce je omezen na vybrané současné zdroje a na jednu implementaci systému DarkFactory. Závěry proto popisují konkrétní realizaci širšího pozorovaného vzoru.
