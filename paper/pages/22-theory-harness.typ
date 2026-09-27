// 2.2 Agent and harness.
//
// Everything here is about the harness rather than the model, which is why it moved out
// of 2.1: what the model cannot do, the context it has to fit in, and the loop it runs
// in are all properties of the layer around it. The opening also develops the three-step
// progression the introduction states in one sentence, because that is the reader's
// first contact with it and the distinction it turns on — who acts — is the one the rest
// of the chapter depends on.
#heading(level: 2)[Agent a harness]

Postupné šíření těchto nástrojů má tři stupně. Nejprve doplňovaly kód v editoru a člověk zůstával tím, kdo jej přijímal a spouští. Potom přišly konverzační chatboty, v nichž model sestavuje odpověď, ale nástroje mu zpravidla nebyly k dispozici, takže i nadále všechno provedl uživatel. Až třetí stupeň, coding agenti, dostal přístup k souborům, příkazům a běhovému prostředí — a tím se poprvé změnila věta, kdo právě jedná.

Tuto hranici lze pojmenovat přesněji: #strong[agent je model plus harness] @langchain-harness. Harness je všechen kód, konfigurace a vykonávací logika, která není samotným modelem. Model sám o sobě neumí udržet stav mezi kroky, spustit kód, přistupovat k údajům, které se po jeho tréninku změnily, ani připravit si prostředí — a právě to všechno mu musí dodat harness. Hrubý model tedy agentem je teprve tehdy, když mu harness dodá stav, vykonávání nástrojů, zpětné vazby a vynutitelná omezení.

Praktickou hranicí mezi konverzačním chatbotem a agentem je právě míra delegovaného provádění. Samotná #strong[Inference] však nemění soubory, nespouští příkazy ani neuchovává stav mezi kroky. Tyto činnosti zajišťuje harness, který modelu zpřístupňuje nástroje, vyřizuje oprávnění a sestavuje prompt z přepisu konverzace. Rozdělení modelu a harnessu je tedy věcí odpovědnosti, nikoli pouhé implementace: první navrhuje, druhý jedná.


#heading(level: 3)[Context window a kompakce]

#strong[Kontextové okno] (*context window*) tvoří pracovní kontext jednoho volání modelu. Může obsahovat instrukce, části repozitáře, historii volání nástrojů i výsledky předchozích kroků. Jeho kapacita však sama o sobě nezaručuje, že model všechny podstatné informace správně využije: úspěšnost jejich vybavení závisí také na umístění v kontextu a může s rostoucí délkou vstupu klesat @liu2024. Toto postupné zhoršování práce s nahromaděným kontextem se označuje jako #strong[context rot] @anthropic-context-engineering.

Kompakce (*compaction*) po překročení stanoveného limitu nahrazuje starší průběh strukturovaným souhrnem klíčových rozhodnutí a dosažených výsledků. Do dalšího volání tak není nutné vkládat celý přepis předchozí interakce @anthropic-context-engineering.


#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je #strong[agentní smyčka], tedy konkrétní implementace
vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022 v daném harnessu: model střídá uvažování
s akcí a harness mezi jednotlivými kroky vrací pozorování, čímž z jednotité generace vzniká
souvislá konverzace @anthropic2024tooluse. V každém kroku model nejprve zdůvodní, co hodlá
udělat, a vyjádří to jako požadavek na nástroj. Harness akci provede v běhovém prostředí a
výsledek vrátí modelu jako pozorování; to se připojí k přepisu konverzace a cyklus se opakuje.
Smyčka končí teprve tehdy, když model místo dalšího požadavku na nástroj vydá závěrečnou
odpověď. Právě tím se smyčka liší od prosté posloupnosti promptů, v níž by model neměl jak
poznat, zda předchozí krok vůbec uspěl; průběh shrnuje @fig-react-loop.

#figure(
  image("/components/img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji provede v běhovém prostředí a pozorování se vrací do dalšího kroku. Ukončení nastává, když model místo další akce vydá závěrečnou odpověď @yao2022.],
) <fig-react-loop>
