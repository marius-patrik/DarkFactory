// Chapter 1, including 1.1 Aim, research question, hypothesis and scope.
//
// The introduction carries no unheaded survey of the literature; the qualification of
// sources — what kind of text each is, its review status, and who stands behind it —
// is stated once here, in the paragraph that sorts them, so that the theory chapter can
// attribute individual sentences without repeating itself. The subsections are fixed by
// the structure of the work: 1.1 and 1.2 Terminology.
#heading(level: 1)[Úvod]

#emph[Šíření nástrojů založených na velkých jazykových modelech má tři stupně.] Nejprve doplňovaly kód
v editoru @github-copilot-completion a člověk zůstával tím, kdo jej přijímá a spouští. Pak přišly
konverzační chatboty @github-copilot-chat, v nichž model sestavuje odpověď, ale nástroje mu zpravidla
nebyly k dispozici, takže i nadále všechno provedl uživatel. Třetí stupeň, #emph[coding agenti]
@github-copilot-agent @openai-codex-2025 @openai-codex-app-2026, dostal přístup k souborům, příkazům
a běhovému prostředí. Tím se poprvé změnilo, kdo práci vlastně dělá, a to je změna, o kterou jde v
této práci. Průmyslové zprávy o šíření agentů do výroby ji popisují jako probíhající
@anthropic-agents-2026.

Rozsah veřejného použití je přitom stále úzký. Jeden ze zveřejněných odhadů klade počet
uživatelů chatbotů na 28~% populace a pravidelné užití #emph[coding agenti] na
0,36~% světové populace @gradually-ai-usage-2026; @fig-gradually-usage tyto dvě skupiny
odlišuje.

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu @gradually-ai-usage-2026.]
) <fig-gradually-usage>

Aby takový agent mohl na projektu pracovat, nestačí generovat odpovědi. Potřebuje kontext
z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, stav, který přežije
jednotlivé kroky, a vymezený bod, v němž člověk rozhodne o přijetí výsledku
@anthropic-harness-design @anthropic-managed-agents. Všechno z toho dodává vrstva, která
model pouze obaluje. Rozdíl mezi schopností modelu a návrhem systému, v němž model pracuje,
je předmětem celé práce; význam pojmů, které ho vyjadřují a které se v češtině dosud
neustálily, je sezbrán v @terminologie.

Použitých zdrojů je několik druhů a z každého se v práci bere jiná věc. Od výrobců nástrojů jsou to inženýrské příspěvky popisující architekturu vlastního produktu: od Anthropic příspěvek o nástrojích @anthropic2024tooluse a o návrhu harnessu pro dlouhé běhy @anthropic-harness-design, od nichž i kontext @anthropic-context-engineering, od OpenAI příspěvek o Codexu @openai-codex-2025, od nichž příkaz `/goal` @claude-goal a cíle @openai-goals, a od LangChain rozbor, co všechno patří do harnesse @langchain-harness, včetně souboru AGENTS.md @agents-md, dovedností @agentskills-spec a protokolu MCP @mcp-specification. Průmyslové zprávy a názory společností, které takové systémy prodávají, slouží k pojmenování a architektuře: @anthropic-agents-2026 @factory2026 @bcg2026 @guild2026. Poslední skupinu tvoří práce, které architekturu měří nebo rozkládají.

Z poslední skupiny jsou čtyři měřicí a jedna poziční. Harness-Bench prošel 5~194 běhových
trajektorií a zjistil, že výslednost se podle dvojice model–harness mění výrazně, takže
schopnost agenta se má podávat na úrovni této dvojice a nikoli samotného modelu
@yao2026harnessbench. HarnessX změřil průměrné zlepšení o 14,5~% na pěti benchmarkech,
největší tam, kde byly výchozí výsledky nejhorší @chen2026harnessx. Ding a jeho
spolupracovníci ukázali, že část toho, co harness přidává k výsledku, lze po tréninku
převést do parametrů modelu @ding2026scaffold. Thangarajah a jeho spolupracovníci ukázali
opačnou věc: co se převede, převádí se pouze v konvencích toho jediného scaffoldu, na němž
se model trénoval @thangarajah2026dcas. Představitelné práce, která architekturu rozkládá na
vrstvy a mluví o ní jako o předmětu vlastního bádání, je poziční a dodává k tomu vlastní
referenční implementaci, takže je citovatelná za slovník a za rámcování, nikoli za měření
@gu2026harness.

Všech pět je nepublikovaný předběžný výtisk. Dvě z nich vznikly v týmech, které prodávají
vlastní implementaci, a výsledek je tedy jejich; totéž platí o měření, které provedl sám
dodavatel @anthropic-harness-design. Každé tvrzení těchto prací proto práce opírá také o
primární zdroj, který lze otevřít v prohlížeči bez účtu, a kde takové spárování neexistuje,
formuluje závěr opatrněji, jako zjištění jediné nerecenzované studie. Ani jedno z nich
není samo o sobě důkazem.

Z toho zároveň plyne, co práce nepřebírá. Tvrzení, že návrh systému je důležitější než
schopnost modelu, samo o sobě neplatí; pole, které této práci předchází, samo píše, že
další pokrok bude záviset #emph[stejně] na návrhu systému jako na silnějších modelech, a
nikoli místo nich @gu2026harness. Stejně tak není doloženo, že se návrh systému od modelu
oddělit nedá. Zajímavá není součet těchto tvrzení, ale to, v čem se liší: co lze do modelu
přenést, co zůstává venku a podle čeho se o tom rozhoduje. To je předmětem teoretické
části, která proto nepočítá s tím, že by měla vyhrát, ale s tím, že bude muset říct, kde
se shoduje a kde ne.

#heading(level: 2)[Cíl, výzkumná otázka, hypotéza a vymezení] <intro-goal>

Rozhodující součástí agentického vývoje softwaru není schopnost jazykového modelu, ale
návrh systému, v němž model pracuje. Cílem práce je tento názor vyargumentovat z dostupných
zdrojů a prověřit na záměrně minimální implementaci, že právě tento návrh je nositelem
schopnosti, o níž mluvíme.

Výzkumná otázka práce zní: #emph[Které principy musí agentický systém splnit, aby
vykonával inženýrskou práci?] Inženýrskou prací se zde rozumí změna repozitáře, kterou
může jiný člověk než její autor přezkoumat a sloučit, aniž by musel agenta na cokoliv ptát;
v tomto smyslu je měřena schopnost systému a v tomto smyslu je brána člověka
nezaměnitelnou. Sloveso #emph[musí] je přitom míněno podmíněně: nutné jsou ty principy,
které samotný model bez zásady okolí neposkytne. Které to jsou, se s rostoucí schopností
modelů posouvá — a právě tato posunutost, nikoli její vymizení, je předmětem dalšího
argumentu práce.

Práce předpokládá tuto hypotézu:

Praktická autonomie je vlastností návrhu systému, který práci řídí, a nikoli vlastností
modelu, který v něm pracuje. Strukturu, kterou práce popisuje, autor navrhuje sám; úsudek o
tom, co je v jednotlivém kroku správné, však přebírá od smyčky, kterou nevlastní — a právě
v tomto rozdílu leží hranice, za kterou teprve vlastní harness pomůže.

Hypotéza se ověřuje v praktické části a z jejího výsledku práce vychází.

Praktická část popisuje DarkFactory, záměrně minimální produkční pipeline pro
AI-asistovaný softwarový vývoj @darkfactory-d576ec8f. Její běh, brány a uložený stav
tvoří harness této práce; jako vykonávací engine používá produkční harnessy, protože to je
pro popsanou míru detailu nejjednodušší. Z toho plyne úzká, ale zřetelně formulovaná
otázka, kterou metodická část ponechává otevřenou: protože vnější vrstva je sama o sobě
harnessem, setkává se model během jednoho běhu se dvěma soubory konvencí současně — s
konvencemi této vrstvy a s konvencemi harnessu, který modelové kroky vykonává. Kterých
konvencí model v takovém uspořádání následuje a co vnější vrstva stojí, je otázka, na
kterou teoretická část neodpovídá.

Rozsah práce je záměrně úzký a odpovídá jedné revizi repozitáře: popisuje počáteční
implementaci, v níž je agentní smyčka (#emph[Agent Loop]) provedena cizím nástrojem. Její rozsah slouží jako
základ, na němž navazuje práce následující.
