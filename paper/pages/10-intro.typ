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

Potom přišly konverzační chatboty @github-copilot-chat, v nichž model sestavuje odpověď, ale
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

Výzkumná otázka práce zní: #emph[Za jakých podmínek agentický systém spolehlivě
vykonává inženýrskou práci?] Inženýrskou prací se zde rozumí změna repozitáře, kterou
může jiný člověk než její autor přezkoumat a sloučit, aniž by musel agenta na cokoli ptát;
v tomto smyslu je měřena schopnost systému a v tomto smyslu je brána člověka
nezaměnitelnou.

Práce předpokládá tuto hypotézu:

Praktická autonomie je vlastností návrhu systému, který práci řídí, a nikoli vlastností
modelu, který v něm pracuje.

Hypotéza se ověřuje v praktické části a z jejího výsledku práce vychází.

Praktická část popisuje DarkFactory, záměrně minimální produkční pipeline pro
AI-asistovaný softwarový vývoj @darkfactory-d576ec8f. Její běh, brány a uložený stav
tvoří harness této práce; jako vykonávací engine používá produkční harnessy, protože to je
pro popsanou míru detailu nejjednodušší.

Rozsah práce je záměrně úzký a odpovídá jedné revizi repozitáře: popisuje počáteční
implementaci, v níž je agentní smyčka provedena cizím nástrojem. Její rozsah slouží jako
základ, na němž navazuje práce následující.
