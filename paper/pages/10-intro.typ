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

Nástroje založené na jazykových modelech prošli v krátké době velkým rozvojem. Nejprve doplňovaly kód v editoru @github-copilot-completion.

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

Až třetí stupeň, #emph[agenti] @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026,
dostal přístup k souborům, příkazům a běhovému prostředí — a tím se poprvé změnilo kdo pracuje.

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu @gradually-ai-usage-2026.]
) <fig-gradually-usage>

S rozvojem nástrojů roste i jejich adopce. Rozsah veřejného použití samotných agentů je přitom stále úzký. Jeden ze zveřejněných odhadů klade počet uživatelů chatbotů na 28~% populace a pravidelné užití #emph[agentů] na
0,36~% světové populace @gradually-ai-usage-2026 @fig-gradually-usage. Přesto je zřejmé, že se jedná o technologii, která se rychle šíří a mění způsob práce, proto v této práci chci ukázat, čeho jsou plnohodnotné systémy schopné.

#heading(level: 2)[Cíl, výzkumná otázka, hypotéza a vymezení] <intro-goal>

Cílem práce je popsat a analyzovat konkrétní implementaci současného přístupu k agentickému inženýrství ve vývoji softwaru.

Výzkumná otázka pak zní: #emph[Jaké architektonické a procesní principy se opakují v současném agentickém vývoji softwaru a jak jsou realizovány v systému DarkFactory?]

Práce vychází z předpokladu, že v analyzovaných současných systémech a zdrojích se opakuje vzor, ve kterém jazykový model je součástí širšího systému, který zajišťuje kontext, nástroje, trvalý stav, orchestraci, ověřování a lidské rozhodovací body.

Praktická část má podobu inženýrské případové studie systému DarkFactory. Nejde o experimentální měření úspěšnosti modelu, ale o systematický popis a kritické zhodnocení toho, jak jsou uvedené principy spojeny v jednom konkrétním produkčním systému.

Rozsah práce je omezen na vybrané současné zdroje a na jednu implementaci systému DarkFactory. Závěry proto popisují konkrétní realizaci širšího pozorovaného vzoru.
