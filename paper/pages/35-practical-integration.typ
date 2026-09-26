#import "../styles/main.typ": draft

// 3.5 Feedback, approval and cleanup.
#heading(level: 2)[Zpětná vazba, schválení a úklid]

Po otevření pro lidskou revizi může člověk použít schvalovací workflow nebo zpětnou vazbu na pull requestu. Změnový požadavek zachycuje runner jako opravný běh na stejné větvi. Agent obdrží plán, konkrétní feedback a aktuální kontext větve, provede úpravu, commitne ji a znovu spustí automatickou review smyčku. Tím se zpětná vazba nevrací do schváleného plánu ani nevyžaduje nový počátek celého požadavku; zachovává se pouze řetězec revizí na jednom pull requestu @darkfactory-d576ec8f.

Schválení pull requestu zpracovává samostatný workflow. Po ověření, že akci provedl autor issue nebo oprávněný člen repozitáře, převede draft na ready stav, zkontroluje požadované schválení a zapne merge. Při úspěchu se použije `--delete-branch`, takže se pracovní větev po sloučení odstraní. Integrace tedy nekončí pouhým otevřením pull requestu: zahrnuje přechod do ready, splnění ochrany větve, merge a bezpečné odstranění větve @github-pull-requests @darkfactory-d576ec8f.

Tato architektura je záměrně jednoduchá. GitHub poskytuje události, schválení, uložení změn a průběh kontroly. GitHub Actions poskytuje výpočet. Docker odděluje běh, Python koordinuje, harness vykonává agentní práci. Složitější služby, trvalý stavový server a více souběžných agentů jsou záměrně mimo základní návrh. Výhodou je snadná reprodukovatelnost a viditelnost každého rozhodnutí. Výhodou je zároveň závislost na dostupnosti GitHubu a na kvalitě promptu, modelu a pravidel repozitáře, kterou samotná automatizace neodstraňuje.

#draft[
  Popsaný průchod odpovídá počátečnímu stavu, kdy pythonovský runner volal cizí produkční CLI. Pozdější revize @darkfactory-e9c10221 tuto vrstvu zrušila: veškeré agentní kroby vedou přes vlastní harness `df`, který si sám volí model a přepíná poskytovatele, a externí CLI zůstávají jen jako zapsané, neinstaltované položky registru. Pro práci má to dva důsledky, které ještě nejsou rozhodnuté. Zaprvé se tím argumentace musí opřít o revizi, v níž dané rozhraní ještě existovala, což je slabší místo, než kdyby praktická část popisovala vlastní nástroj. Zadruhé se nabízí otázka, zda vlastní harness není vhodnější předmět praktické části právě proto, že jeho rozhraní lze popsat úplně a jeho změny jsou autorově vlastní. Zatím je tedy tato poznámka návrhem k doplnění, nikoli závěrem.
]
