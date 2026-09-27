// 2.2 Agent and harness.
#heading(level: 2)[Agent a harness]
Praktickou hranicí mezi konverzačním chatbotem a agentem je míra delegovaného provádění. V běžném chatovém režimu model především vrací text a uživatel zůstává vykonavatelem navržených kroků. Agent naproti tomu prostřednictvím harnessu získává řízený přístup k nástrojům a prostředí: může procházet soubory, upravovat kód, spouštět testy a používat jejich výstupy v dalších krocích @anthropic2024tooluse @openai-agents-sandbox. Role člověka se tím může posunout od provádění jednotlivých kroků k zadání, omezení a revizi delegované práce.


#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je #strong[agentní smyčka], tedy konkrétní implementace vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022 v daném harnessu. V každém kroku model střídá dvě části: uvažování, kterým zdůvodní, co hodlá udělat, a akci, kterou to vyjádří jako požadavek na nástroj. Harness akci provede v běhovém prostředí a výsledek vrátí modelu jako pozorování; to se připojí k přepisu konverzace a cyklus se opakuje. Smyčka končí teprve tehdy, když model místo dalšího požadavku na nástroj vydá závěrečnou odpověď. Právě tím se smyčka liší od prosté posloupnosti promptů, v níž by model neměl jak poznat, zda předchozí krok vůbec uspěl; průběh shrnuje @fig-react-loop.

#figure(
  image("/components/img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji provede v běhovém prostředí a pozorování se vrací do dalšího kroku. Ukončení nastává, když model místo další akce vydá závěrečnou odpověď @yao2022.],
) <fig-react-loop>
