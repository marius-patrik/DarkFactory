// 3.5 Feedback, approval and cleanup.
//
// The actor check compares GITHUB_ACTOR against one hardcoded account, the repository
// owner, not a question about the issue author and not a permission query. The
// allowlist literal looks like two names but deduplicates, because REPO_OWNER is the
// same account as the hardcoded one. What may fill the gate, and the bot's name in the
// record, are stated in chapter 4's fourth finding, where the system is judged rather
// than described.
#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu.
Změnový požadavek spustí runner jako opravný běh na téže větvi. Agent obdrží plán, konkrétní zpětnou vazbu
a aktuální kontext větve, provede úpravu, uloží ji jako commit a znovu spustí automatickou review smyčku. Zpětná
vazba se tak nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Ten nejprve ověří, kdo akci provedl: aktér se porovnává
s jedním pevně zapsaným účtem, vlastníkem repozitáře. Neověřuje se tedy autor issue ani úroveň oprávnění, ale
členství v tomto seznamu @darkfactory-d576ec8f. Workflow pak převede draft na stav „ready",
zkontroluje požadované schválení a spustí merge s `--delete-branch`, takže se pracovní větev po
sloučení odstraní.

Popsaná architektura je prvním krokem. Projekt DarkFactory se od tohoto stavu posunul dál; kam se posunul a
proč, je předmětem práce následující, a zde to záměrně není rozvedeno.
