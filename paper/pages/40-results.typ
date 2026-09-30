// Chapter 4: findings and discussion.
#heading(level: 1)[Zjištění a diskuse] <findings-discussion>

Výzkumná otázka se ptá, jaké architektonické a procesní principy se opakují v současném agentickém
vývoji softwaru a jak jsou realizovány v systému DarkFactory. Z teoretické části vyplývá společný
vzor: jazykový model není samostatným vývojovým systémem, ale pracuje uvnitř harnessu a širšího
workflow, které mu poskytují kontext, nástroje, stav a oprávnění. Nad jednotlivými modelovými kroky
pak stojí specifikace cíle, orchestrace procesu, programově proveditelné kontroly a explicitní
rozhodovací body člověka @langchain-harness @anthropic-context-engineering
@openai-agent-orchestration. DarkFactory tyto prvky nespojuje do nové agentní smyčky, ale do
repozitářového procesu, který používá existující coding-agent harnessy jako vykonávací vrstvu.

První podstatné zjištění případové studie je význam #strong[trvalého stavu mimo model]. V DarkFactory
není autoritativním záznamem práce přepis konverzace, ale GitHub: původní požadavek, interpretace a
plán jsou zachyceny v issues a komentářích, implementace ve větvi a commitech a výsledná změna v pull
requestu. Jednotlivé agentní běhy proto mohou skončit a další běh na ně může navázat bez nutnosti
zachovat celý předchozí kontext modelu @darkfactory-d576ec8f. Praktická realizace tak odpovídá
principu context engineering, podle něhož má dlouhodobý stav existovat odděleně od pracovního
kontextového okna @anthropic-context-engineering.

Druhé zjištění se týká #strong[dělby odpovědností]. Produkční harness zajišťuje agentní smyčku,
nástroje a komunikaci s modelem, zatímco DarkFactory řídí, kdy se agent spustí, jaký stav obdrží,
kam se jeho výstup uloží a co následuje dál. Deterministicky popsatelné činnosti, jako práce s Git
větví, formátování, spuštění testů nebo změna stavu workflow, jsou prováděny programově; otevřené
úlohy, například interpretace, plánování, implementace a modelová revize, jsou delegovány agentovi
@darkfactory-d576ec8f. Tento způsob kombinace modelového a programového řízení odpovídá současnému
pojetí orchestrace, které oba přístupy kombinuje podle povahy jednotlivých kroků
@openai-agent-orchestration.

Třetím zjištěním je role #strong[specifikace a lidských bran]. DarkFactory odděluje porozumění
požadavku od implementačního plánu a před samotnou implementací vyžaduje lidské schválení obou
kroků. Agent tak může samostatně zvolit konkrétní technický postup, ale začíná až poté, co člověk
potvrdil záměr a navržený způsob realizace. Po implementaci se odpovědnost člověka vrací při přijetí
výsledného pull requestu. Praktická část tím ukazuje human-in-the-loop nikoli jako průběžné ruční
ovládání agenta, ale jako několik explicitních rozhodnutí kolem automatizované práce.

Čtvrté zjištění se týká #strong[začlenění agenta do běžného softwarového workflow]. Výstupem
DarkFactory není izolovaná odpověď modelu, ale větev, commity, dokumentace a pull request, které lze
číst a revidovat běžnými nástroji. Podobný princip se objevuje i v produkční praxi: Stripe popisuje
interní coding agenty, jejichž změny končí pull requestem určeným k lidské revizi, a Meta popisuje
agentní systém schopný dovést automatizovaný proces k pull requestu připravenému pro člověka
@stripe-minions-2026 @meta-capacity-efficiency-2026. DarkFactory je výrazně menší případ, ale používá
stejnou základní hranici mezi autonomní prací a standardním integračním mechanismem repozitáře.

Samostatnou roli má #strong[dokumentace]. Ve zkoumané revizi vzniká veřejná API dokumentace inline
u kódu a dokumentační web se generuje z kanonických zdrojů repozitáře. Pro agentní systém je tento
princip užitečný ve dvou směrech: agent pracuje se zdroji, které jsou verzovány společně s kódem,
a člověk dostává čitelný pohled nad stejným systémem bez nutnosti udržovat druhou, ručně
synchronizovanou dokumentaci @darkfactory-d576ec8f. Dokumentace tak funguje jako rozhraní mezi
strojově prováděným vývojem a lidskou kontrolou.

Případová studie zároveň ukázala omezení počáteční implementace. Automatická code review i kontrola
souladu s plánem jsou samy modelové kroky, takže nepředstavují deterministický důkaz správnosti.
Review smyčka je ohraničená a po vyčerpání povolených iterací může skončit bez explicitního čistého
verdiktu. Testovací sady se po implementaci spustí a při neúspěchu dostane agent jeden opravný krok,
ale po této opravě se ve zkoumané revizi stejná verifikace znovu neprovádí před vytvořením commitu.
Stejně tak může nález označený jako mimo schválený plán doplnit rozsah jako `Plan Deviation` a
`Scope Amendment` bez nového lidského schválení původního plánu @darkfactory-d576ec8f. Tyto body
nepopírají architektonický vzor, ale ukazují místa, kde jednoduchý bootstrap ještě neprosazuje své
vlastní hranice tak důsledně, jak by mohl.

Dalším omezením je rozsah samotné případové studie. Zkoumán je jeden systém a jedna jeho revize;
práce neměří obecnou úspěšnost modelů ani neporovnává jednotlivé harnessy. Nelze proto z výsledku
odvodit, že stejné uspořádání bude stejně fungovat v každém repozitáři nebo s každým modelem.
Přenositelné je především pozorování o skladbě procesu: schopnost modelu je jen jedna část výsledku
a praktický agentický vývoj vzniká až propojením specifikace, kontextu, nástrojů, trvalého stavu,
orchestrace, kontrol a lidského rozhodování.

DarkFactory současně ukazuje praktický význam tohoto spojení. První verze byla záměrně omezena tak,
aby ji bylo možné vytvořit jako bootstrap pomocí coding agentů a následně stejnou pipeline použít k
dalšímu rozšiřování vlastního systému. Přínosem případové studie proto není tvrzení, že agentem
vytvořený software je automaticky kvalitnější, ale konkrétní ukázka, že agentické inženýrství lze
převést z jednotlivého použití coding agenta do opakovatelného repozitářového procesu, ve kterém
jsou jeho role a hranice explicitně navrženy.
