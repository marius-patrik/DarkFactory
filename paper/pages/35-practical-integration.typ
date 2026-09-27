// 3.5 Feedback, approval and cleanup.
//
// The third correction lives here: the actor check is a two-entry allowlist compared
// against GITHUB_ACTOR, not a question about the issue author and not a permission
// query. The proxy approval that can follow is stated in the same place, because a
// reader who has just been told the gate is human needs to know what may fill it.
#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu. Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní feedback a aktuální kontext větve, provede úpravu, uloží ji jako commit a znovu spustí automatickou review smyčku. Tím se zpětná vazba nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku; zachovává se pouze řetězec revizí na jednom pull requestu @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Ten nejprve ověří, kdo akci provedl, a ověření je užší, než by se z krátkého popisu zdálo: aktér se porovnává se seznamem dvou pevně zapsaných účtů, vlastního repozitáře a jednoho dalšího. Neověřuje se tedy autor issue ani úroveň oprávnění, ale členství v tomto seznamu @darkfactory-d576ec8f. Teprve pak workflow převede draft na ready stav, zkontroluje požadované schválení a zapne merge; při úspěchu použije `--delete-branch`, takže se pracovní větev po sloučení odstraní. Integrace tedy nekončí pouhým otevřením pull requestu: zahrnuje přechod do ready, splnění ochrany větve, merge a bezpečné odstranění větve @github-pull-requests @darkfactory-d576ec8f.

Je tu třeba přiznat věc, která třetí kritérium metodické části oslabuje. Jestliže ochrana větve stále vyžaduje schválení, workflow podá #emph[zástupné] schválení jménem jiného účtu, aby merge neuvázl @darkfactory-d576ec8f. Podmínkou je druhý přihlašovací údaj; kde není, pipeline čeká na skutečné schválení člověka. V konfiguraci, v níž je nastaven, je však schválení, které by mělo být lidským rozhodnutím, vydáno strojem. Třetí kritérium je proto plněno jako #emph[bod], na kterém člověk rozhodne, a ne jako #emph[záruka], že rozhodne on; rozdíl je malý v textu a velký v tom, co z něj plyne, a práce ho záměrně nerozšiřuje.

Tato architektura je záměrně jednoduchá. GitHub poskytuje události, schválení, uložení změn a průběh kontroly, GitHub Actions výpočet, Docker odděluje běh, Python koordinuje a harness vykonává agentní práci. Složitější služby, trvalý stavový server a více souběžných agentů jsou záměrně mimo základní návrh. Výhodou je snadná reprodukovatelnost a viditelnost každého rozhodnutí; výhodou je zároveň závislost na dostupnosti GitHubu a na kvalitě promptu, modelu a pravidel repozitáře, kterou samotná automatizace neodstraňuje.

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
