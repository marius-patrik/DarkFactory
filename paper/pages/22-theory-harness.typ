// 2.2 Agent and harness.
#heading(level: 2)[Agent a harness]
Praktickou hranicí mezi konverzačním chatbotem a agentem je míra delegovaného provádění. V běžném chatovém režimu model především vrací text a uživatel zůstává vykonavatelem navržených kroků. Agent naproti tomu prostřednictvím harnessu získává řízený přístup k nástrojům a prostředí: může procházet soubory, upravovat kód, spouštět testy a používat jejich výstupy v dalších krocích @anthropic2024tooluse @openai-agents-sandbox. Role člověka se tím může posunout od provádění jednotlivých kroků k zadání, omezení a revizi delegované práce.


#heading(level: 3)[Smyčka]

Základním mechanismem agentického systému je iterativní řídicí smyčka podle vzoru #strong[ReAct] (*Reasoning and Acting*) @yao2022. Model v každém kroku na základě aktuálního kontextu zvolí mezi možnostmi rozvažovaní, volání nástroje ve strukturovaném požadavku nebo zprávy v chatu (konečná akce). Harness každý krok přidá do přepisu konverzace a nový přepis se vrátí modelu. V případě použití nástroje tuto akci provede v běhovém prostředí, zachytí výsledek a vrátí jej modelu jako nové pozorování. 

#figure(
  image("/components/img/react-loop.svg", width: 75%),
  caption: [Agentní smyčka ReAct: model navrhne akci, harness ji zprostředkuje a vykoná v prostředí a pozorování se vrací do dalšího kroku@yao2022.],
) <fig-react-loop>
