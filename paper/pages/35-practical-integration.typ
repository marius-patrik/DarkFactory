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
Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní zpětnou vazbu
a aktuální kontext větve, provede úpravu, uloží ji jako commit a znovu spustí automatickou review smyčku. Zpětná
vazba se tak nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Ten nejprve ověří, kdo akci provedl: aktér se porovnává
s jedním pevně zapsaným účtem, vlastníkem repozitáře. Neověřuje se tedy autor issue ani úroveň oprávnění, ale
členství v tomto seznamu @darkfactory-d576ec8f. Teprve pak workflow převede draft na ready stav, zkontroluje
požadované schválení a zapne merge s `--delete-branch`, takže se pracovní větev po sloučení odstraní.

Přesun na projektovou tabuli dělá osobní přístupový token. GitHub přiřazuje práva k Projects v2 jen organizacím
a tabule patří uživateli, takže aplikace k této tabuli nedosáhne @darkfactory-d576ec8f.

Popsaný průchod končí tam, kde pythonovský runner volal cizí produkční CLI @darkfactory-d576ec8f. Popsaná
architektura je tedy prvním krokem a její popis nenahrazuje posouzení vlastních omezení. Projekt DarkFactory se od tohoto stavu posunul dál; kam se posunul a proč, je předmětem práce
následující, a zde to záměrně není rozvedeno.
