    Transformer a LLM
        Transformer je nový typ neurální sítě, se kterým přišel Google v roce 2017 jako důsledek snahy vylepšit model za jejich jazykovým překladačem.
        Narozdíl od klasických typů NN, které jsou schopné poznat pouze jeden objekt nebo provést jednou izolovanou akci pro kterou byly specificky natrénovany využívá transformer mechanismus zvaný "attention" neboli pozornost pro porozumnění spojitostem mezi jednotlivými "embeddingy".
        LLM neboli Large Langauge Model, česky Velký jazykový model je typ neurální sítě postavený na architektuře transformeru a natrénováný na datasetu obsahujícím veliké množství textu. Díky attention je model schopný si mezi všemi těmi informacemi udělat nějaký smysl a vychází z toho něco připomínající inteligenci.

    Tokeny, tokenizér a embedding

    Harness a System Prompt
        Harness je program okolo jazykového modelu, ne ten který ho spouští, ten je nazván inference egnine a stará se pouze o samotné výpočetní operace uvnitř modelu, ale ten který má na starost rozhraní mezi uživatelem a agentem nebo chatbotem, spouštení nástrojů a nekonečnou smyčku AKA ReAct Loop. Příklady jsou: webová apliakce ChatGPT, Claude Code terminálový interface, Codex desktopová aplikace a spousta dalších...


    Agent vs Chatbot
        Rozdíl mezi chatbotem a agentem je v principu, že chatbot je schopný pouze textu v konverzaci AKA chatu, agent se z něj stáva ve chvilí kdy je schopný dělat více než to, tedy když mu přidáme nástroje, se kterými může například prohledávat web, upravovat soubory nebo i přímo ovládat váš počítač.


    ReAct Loop
        Read and Act Loop je základ systému který dělá z jazykového modelu více než pouze generátor textu a něco bližšího osobnímu asistentovi. Princip je jednoduchý, model si přečte vstupní text neboli prompt a na jeho základě udělá nějakou akci. Toto se opakuje v nekonečné smyčce dokud se model nerozhodne, že už nemá žádnou možnou akci.

        Součást tohoto systému je také princip, že pokaždé hotové generaci modelu se jeho výstup přidá do tzv. Context Window neboli logu konverzace a na každém dalším kroku je celá predešlá část poslána modelu. Tím dosáhneme kontinualní konverzace místo jednotné generace.

    
    Vyvolávání nástrojů
        Už víme že abysme z assistenta udělali agenta musíme mu dát nástroje, jsou různe způsoby jak toho docílit a podle situace se hodí vybrat vhodný typ. Základní typ je tkzv. JSON tool calling tedy model ve svém výstupu zanechá JSON call ve formě schéma, které mu zadá harness, ten následně vykoná zadaný úkon a agentovi vratí odpověd také ve formě JSON. Tato možnost je velice efektivní na základní nástroje pro Agenta, který není určený na využití pro softwarový vývoj, ale něco základnějšího nebo velice specifického, například Agent nasazený pro costumer support potřebuje pouze používat zakladní funkce systému. Pro softwarový vývoj je tato možnost nevhodná z důvodu spousty znaků navíc jako důsledek JSON formátu, každý z těchto znaků se konvertuje do tokenů které model zpracovavá a to může ve větším objemu vést k tzv. "Context Rotu" viz. Context Rot. V případu ecommercu obchodu například stačí stav objednávek a pár takových věcí. V případě ChatGPT se jedná o hledání na webu a základní operace se soubory.  
        
        Další možnost je tzv. code execution, v tomto případě dáme agentovi například Python nebo TypeScript environment, agent napíše kód pro dosažení svého účelu a může ho spustit ve svém prostředí, buď po jednotlivých kouscích nebo všechen naráz. Environment AKA prostředí může být buď přímo váš počítač, nebo tzv. "Sandbox" česky pískoviště. To v praxi znamená že agent funguje ve virtualním prostředí odděleném od Vašeho počítače ve jménu bezpečnosti. Tato možnost je efektivní pro softwárový vývoj.


    Skilly Scripty a Hooky
        Tyto standardy vznikly aby vývojáří mohli efektivně upravit chování svého agenta pro svou práci. Skill je složka souborů, která může hooky a scripty obsahovat, ale v esenci je to SKILL.md soubur neboli text. Efektivně je to předpřivaný prompt pro nějakou specifickou situaci. Nejedná se o pouhý Markdown, je zde použit takzvaný JSON frontmatter, díky kterému lze do souboru efektivně přidat metadata, která harness následně použivá aby nemusel agentovi vždy dávat celý obsah všech vašich skillů, ale dá mu pouze seznam názvu a popisků a schéma použití, samotný text skillu je pak načten až když je vyvolán. Script je jednoduše prostě script napsaný v jakémkoliv jazyku, např. Python. Toto je vitalní pro efektivnost práce aby agent nemusel psát každý příkaz z ničeho a hlavně je díky tomu možné automatizovat komplexnější úlohy. Hooky jsou scripty, které se sami vyvolají v nějakém určitém případě.

 
    MCP Server
        Model Context Protocol vznikl v laboratoři Anthropicu jako způsob pro efektivní interakci agentů s API servery. Ve své podstatě se jedná o nástroje postavené na základu externího API tedy to sjednotí různe standarty do jednoho a přidá "context" efektivně metadata pro každou přítomnou metodu, aby agent veděl co má od nich čekat a nemusel sám přijít na to jak backend funguje.


    Prompt Engineering
        Je praxe ve které se jednoduše snažíme napsat co nejlepší prompt pro docílení našeho nasazení pomocí modelu.


    Multimodální modely
        Architektura transformeru se dá nasadit na více než pouze jazyk. V praxi se dá tokenizovat vlastně cokoliv a tedy můžeme natrénovat model pro cokoliv. Ať už je to generovaní videí či obrazků nebo například ovladání robota, 3D animace a spousta dalšího.

        Zajímavé to začíná být ve chvilí kdy jednomu modelu dáme více embedding vrstev a dosáhneme tak modelu který je schopen dělat tyto věci všechny naráz a také mít attention mezi těmito různými modality. Tím jsme schopni udělat model, který se podivá na obrázek a porozumí co se v něm děje pak to může jazykem popsat a klidně a vygenerovat audio své řeči znějící jako opravdový člověk.

        Toto také vede k velkému růstu inteligence.
        

    Subagenti
        Když dáme agentovi nástroj s možností vyvolat jiného agenta, zadat mu úlohu, interagovat s ním a sledovat jeho progress drasticky zvýšíme jeho efektivnost pro rozsáhlé úlohy. Tomuto se říká "subagents".

    Context 
        Turn
            Každému kroku mezi modelem a uživatelem se říká turn, nebo specificky model turn pro každé spuštění inference.

        Context Window
            Model je schopný přijmout pouze limitovaný objem vstupu, tomuto limitu se říká Context Window, vyjadřuje se v množství tokenů. Tento limit vychází z tzv. dictionary, který je závisly na datasetu použitém pro tréning.

        Compaction
            Je akce, kterou provede harness v moment kdy se CW naplní. Prakticky se jedná o externí vyvolaní modelu s intrukcí, aby zkrátil konverzaci a vloženým celým logem konverzace. Výsledný zkracený context je od té chvíle používán místo původní části konverzace.

        Context Rot
            Je koncept, který byl pozorován v praxi, kdy modely ztrácí inteligenci a nejsou schopni si zapamatovat detaily ze začátku čím plnější je CW.

        KV Caching
            Se používa pro snížení náročnosti modelu na výpočetní techniku. Místo toho abysme skutečne na každém kroku skutečne vypočítali celou konverzaci znovu inference engine nechá v paměti nahrané předešlé již vypočítané části a pouze přídavá co je nového.


    Workflows neboli Graph Engineering
        Jakmile se snažíme organizovat nebo automatizovat úlohu složitější než pár kroků začne se systém rozpadat. V tom případě pricházejí "workflows" česky pracovní postupy AKA grafy. Grafy se ve softwarovém vývojí používají ve spoustě situacích. Graf se skláda z nodes a edges neboli bodů a spojů v tomto kontextu to znamená že každý bod je izolovaný agent, který má připravený Prompt Skilly a nástroje a spoje mezi nimy vyznačují cestu informací a práce. Abstrakcí tohoto grafového systému jsme schopni tento pipeline nasadit na jakoukoliv práci klidně i dynamicky pomocí orchestrace dalším agentem.


Sources: 
    Google: Attention is all you need = https://arxiv.org/abs/1706.03762 ; 
    Anthropic MCP server documentation = https://modelcontextprotocol.io/docs/2026-07-28/getting-started/intro#explore-mcp ;
    Deepseek Harness = https://arxiv.org/abs/2608.25512 ;
    Anthropic: Prompt Engineering = https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview ;


