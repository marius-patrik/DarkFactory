// 1.2 Terminology.
//
// The guide asks that the terms a work uses be defined, and that where several
// senses exist, the one chosen here be stated (kap. 2.3). Marking scores "Odborná
// správnost, správné používání termínů" out of 10, which makes this the single
// densest block of marks in the paper.
//
// It sits in chapter 1 rather than in the theory, which the guide suggests,
// because the thesis is introduced as an introduction: a reader who meets
// "harness" or "context rot" for the first time in chapter 2 has already been
// lost. The relationship to the theory is deliberate — this section gives the
// compact definition and says which sense is meant; the theory then develops
// the ones that need argument. Neither restates the other.
//
// Every term used anywhere in the paper appears here, grouped by what it belongs
// to, so that a reader can find a word rather than infer it from context.
#heading(level: 2)[Terminologie] <terminologie>

Práce používá několik výrazů, které mají v běžném užívání více významů nebo
nestabilní české ekvivalenty. Níže je uveden význam, v jakém jsou užívány zde,
aby je nebylo nutné odhadovat z kontextu.


#heading(level: 3)[Model a jeho kontext]

#strong[Jazykový model] (LLM) je program, který z posloupnosti tokenů předpovídá
další token. #strong[Token] je nejmenší jednotka textu, se kterou model pracuje;
#strong[kontext] je soubor tokenů předložených při jednom volání a #strong[inference]
samotné toto volání. #strong[Transformer] je architektura, která v kontextu
propojuje jednotlivé tokeny mechanismem #strong[attention] @vaswani2017
@brown2020. #strong[Embedding] je vektorová reprezentace slova, v níž se
zachovávají sémantické vztahy @mikolov2013linguistic. #strong[Prompt] je zadání
předané modelu; v této práci vždy s výslovně uvedenými hranicemi, nikoli jako
otázka bez omezení.


#heading(level: 3)[Agent, harness a smyčka]

#strong[Agent] je systém, který na základě zadání sám volí další krok.
#strong[Harness] je program, který agenta obalí: sestavuje kontext, předává modelu
významy nástrojů, vykonává je, vyřizuje oprávnění a vrací modelu výsledky.
#strong[ReAct] je vzor smyčky, v němž model střídá uvažování s akcí a harness mezi
jednotlivými kroky vrací pozorování @yao2022. #strong[Agentní smyčka] (*agent
loop*) je konkrétní implementace tohoto vzoru v konkrétním harnessu: sestavený
kontext, výzva nástroje, jeho provedení, pozorování a rozhodnutí, zda pokračovat.
Vzorec tedy popisuje, jak smyčka vypadá, agentní smyčka je to, co v daném
nástroji právě běží. #strong[Kontextové okno] je
pracovní kontext jednoho volání; jeho zaplnění samo o sobě nezaručuje, že model
podstatné informace využije, a postupné zhoršování kvality zaplněného kontextu se
označuje jako #strong[context rot] @anthropic-context-engineering.
#strong[Kompakce] je nahrazení staršího průběhu strukturovaným souhrnem
@anthropic-context-engineering.

Dále se v práci objevují výrazy pro řízení smyčky a práci více agentů:
#strong[goal loop] je vnější smyčka, která po dokončení vnitřní smyčky porovná
stav s cílem a rozhodne, zda pokračovat; #strong[human-in-the-loop] (HITL) je
brána vyžadující explicitní lidské rozhodnutí; #strong[orchestrace] je rozdělení
úlohy mezi více běhů se správou jejich závislostí @openai-agent-orchestration.
#strong[Koordinátor] je běh, který dílčí úkoly přiděluje specializovaným
#strong[subagentům]. #strong[Workflow graph] předem určuje pořadí a větvení fází.


#heading(level: 3)[Disciplína: agentní a agentické]

Zde je rozdíl, který v práci znovu rozhoduje. #strong[Agentní] označuje vlastnost
agenta, tedy toho, kdo jedná. #strong[Agentický] označuje vlastnost systému,
tedy toho, kdo jednat umožňuje. Jazykový základ tomu odpovídá: anglické
#strong[agentic] je odvozeno od podstatného jména #strong[agent] příponou
#strong[-ic] a znamená mající schopnost, prostředky nebo pravomoc jednat, nikoli
samo jednajícího @mw-agentic. V češtině není tento překlad ustálený; přídavné
jméno #strong[agentické] je v této práci zavedeno poprvé.

Z toho plyne, jak je užíváno #strong[agentické inženýrství] (#strong[Agentic
Engineering]): jako soubor postupů, jimiž se staví systémy s takovým chováním,
nikoli jako stavba samotných agentů @willison-agentic-engineering. Příbuzné
podoblasti, na které práce odkazuje, jsou #strong[Prompt Engineering],
#strong[Context Engineering], #strong[Harness Engineering], #strong[Loop
Engineering] a #strong[Workflow/Graph Engineering]. Podobně
#strong[spec-driven development] znamená, že zadání je nejprve dohodnutý a
měřitelný, teprve potom vzniká kód.


#heading(level: 3)[Výroba softwaru]

#strong[Software factory] je pojem z roku 1968, kdy šlo o strojově řízené
výrobní prostředí pro konstrukci programů @nato1969; později o industrializaci
vývoje standardizací metod a znovuvyužitelností komponent @cusumano1991factory.
Agentům se jím dnes označuje systém, který práci vyhazuje, plánuje, provádí,
revizuje a předává člověku @factory2026 @bcg2026. Podrobně je vztah obou
významů rozveden v @software-factory.

#strong[Pipeline] je posloupnost kroků zpracovávajících požadavek. Její
#strong[workflow] je konkrétní konfigurace, která se v repozitáři spouští;
#strong[runner] je program, který uvnitř ní udržuje stav a volá jednotlivé kroky.
#strong[Stavový systém] je místo, kde průběh přežívá ukončení běhu — zde GitHub.
#strong[Kontejner] zajišťuje izolaci běhu od zbytku prostředí; jeho pracovní strom
je to, co agent smí měnit.


#heading(level: 3)[Práce se změnou v repozitáři]

Výrazy níže jsou použity v doslovném významu nástrojů, kterými práce pracuje.
#strong[Issue] je požadavek a místo jeho komentářů; #strong[branch] je pracovní
větev oddělená od hlavní @github-branches. #strong[Commit] je uložená změna,
#strong[push] její odeslání do repozitáře. #strong[Pull request] je návrh
sloučení větve @github-pull-requests; má stavy #strong[draft] a #strong[ready],
přičemž schválení znamená přechod do ready a následné #strong[merge] @github-pull-requests.
#strong[Review] je posouzení změny; #strong[nález] je konkrétní zjištěný nedostatek
a #strong[blokace] stav, v němž se opakovaný nález bez progresu zastaví.
#strong[CI] (průběžná integrace) je automatické spouštění formátovacích nástrojů a
testovacích sad při každé změně; výsledkem je pouze návratový kód, tedy
pozorování, které se dá opakovat. #strong[Scope kontrola] je pak dotaz na model,
zda se změny drží v rozsahu schváleného plánu — jde tedy o posouzení, nikoli o
porovnání dvou sad souborů, a je proto stejně pravděpodobnostní jako review. #strong[Checkout] je získání pracovní kopie repozitáře.
#strong[Deklarativní registr] je zápis vlastností nástroje — bináře, příkazové
řádky a přihlášení — do dat, z nichž se sestaví jeho volání, místo kódu.
