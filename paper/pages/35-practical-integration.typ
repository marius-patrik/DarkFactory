// 3.5 Feedback, approval and cleanup.
//
// The third correction lives here: the actor check compares GITHUB_ACTOR against one
// hardcoded account, the repository owner, not a question about the issue author and not
// a permission query. The allowlist literal looks like two names but deduplicates, because
// REPO_OWNER is the same account as the hardcoded one. What may fill the gate, and the
// bot's name in the record, are stated in 4.1's fourth finding, where the system is
// judged rather than described.
#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu. Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní zpětnou vazbu a aktuální kontext větve, provede úpravu, uloží ji jako commit a znovu spustí automatickou review smyčku. Tím se zpětná vazba nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku; zachovává se pouze řetězec revizí na jednom pull requestu @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Ten nejprve ověří, kdo akci provedl, a ověření je užší, než by se z krátkého popisu zdálo: aktér se porovnává s jedním pevně zapsaným účtem, vlastníkem repozitáře.
Neověřuje se tedy autor issue ani úroveň oprávnění, ale členství v tomto seznamu @darkfactory-d576ec8f. Teprve pak workflow převede draft na ready stav, zkontroluje požadované schválení a zapne merge. Přesun na projektovou tabuli dělá osobní přístupový token, protože GitHub přiřazuje práva k Projects v2 jen organizacím; tabule patří uživateli při úspěchu použije `--delete-branch`, takže se pracovní větev po sloučení odstraní. Integrace tedy nekončí pouhým otevřením pull requestu: zahrnuje přechod do ready, splnění ochrany větve, merge a bezpečné odstranění větve @github-pull-requests @darkfactory-d576ec8f.

Tato architektura je záměrně jednoduchá. GitHub poskytuje události, schválení, uložení změn a průběh kontroly, GitHub Actions výpočet, Docker odděluje běh, Python koordinuje a harness vykonává agentní práci. Složitější služby, trvalý stavový server a více souběžných agentů jsou záměrně mimo základní návrh. Výhodou je snadná reprodukovatelnost a viditelnost každého rozhodnutí; nevýhodou je zároveň závislost na dostupnosti GitHubu a na kvalitě promptu, modelu a pravidel repozitáře, kterou samotná automatizace neodstraňuje.

// The scope boundary, stated once here at the point a reader meets the end of the
// described pipeline, and again in 1.1 where the aim is set. What follows is not a
// caveat: the follow-up thesis takes the later state as its subject, and this
// thesis deliberately stops at the initial implementation.
Směr vývoje, který práce záměrně nepopisuje, je vymezen v @intro-goal. Zde je tedy
přesnější dodat, kde popsaný průchod končí: je popsán stav, v němž pythonovský runner
volal cizí produkční CLI @darkfactory-d576ec8f. Popsaná architektura je tudíž
mezníkem, nikoli vyvrcholením, a její popis nenahrazuje posouzení této meze, které
patří do @diskuse. Projekt @darkfactory se od tohoto stavu posunul dál; kam se posunul
a proč, je předmětem práce následující, a zde to záměrně není rozvedeno.
