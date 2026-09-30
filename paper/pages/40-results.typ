#heading(level: 1)[Zjištění a diskuse] <findings-discussion>

Výzkumná otázka se ptá, jaké principy se opakují v současném agentickém vývoji softwaru a jak je realizuje DarkFactory. Z analyzovaných zdrojů vystupuje společný vzor. Model pracuje uvnitř agentní vrstvy a širšího procesu, trvalý stav zůstává mimo jeho kontext, otevřený úsudek se odděluje od programově proveditelných kontrol a důležitá rozhodnutí zůstávají člověku @langchain-harness @anthropic-context-engineering @openai-agent-orchestration.

DarkFactory tento vzor realizuje pomocí běžného repozitářového procesu. GitHub uchovává stav práce, automatizace řídí pořadí kroků a agent řeší úlohy, které nelze předem přesně naprogramovat @darkfactory-d576ec8f. Výsledek se vrací do větve a požadavku na sloučení, takže agentní práce zůstává čitelná a kontrolovatelná stejnými nástroji jako práce člověka. Podobnou hranici mezi autonomní prací a lidskou revizí popisují také Stripe a Meta @stripe-minions-2026 @meta-capacity-efficiency-2026.

Prakticky důležitá je i dokumentace generovaná z kanonických zdrojů. Agent pracuje s verzovanými pravidly a kódem, zatímco člověk dostává čitelný pohled nad stejným systémem. Dokumentace tak propojuje automatizovanou implementaci s lidskou kontrolou @darkfactory-d576ec8f.

Počáteční implementace má současně konkrétní omezení. Modelová revize není deterministickým důkazem správnosti, omezená revizní smyčka může skončit bez čistého verdiktu, verifikace se po jednom opravném kroku znovu neopakuje a změna rozsahu může pokračovat bez obnoveného schválení původního plánu @darkfactory-d576ec8f. Zjištění proto nelze zobecnit na všechny modely nebo repozitáře.

Případ DarkFactory ukazuje především to, že praktický agentický vývoj nevzniká samotným modelem. Vzniká až spojením specifikace, kontextu, nástrojů, trvalého stavu, orchestrace, kontrol a lidského rozhodování. Záměrně malá první verze navíc ukazuje, že takový proces lze použít jako počáteční základ pro další rozvoj stejného systému.
