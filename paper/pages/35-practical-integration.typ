#import "../components/terms.typ": term-name

#heading(level: 2)[Implementace pomocí agentů] <darkfactory-bootstrap>

DarkFactory byla sama vyvíjena pomocí komerčních #term-name("Coding Agents", cs: "coding agenti"). Člověk určoval cíl a zásadní rozhodnutí, zatímco samotná implementace proběhla v jednom souvislém agentním běhu.

Běh nezačal psaním kódu, ale plánovacím režimem. Prvním cílem agenta bylo navrhnout architekturu DarkFactory a rozdělit odpovědnost mezi GitHub, automatizaci, agentní vrstvu a lidské rozhodovací body. V této fázi vznikl plán systému ještě před vlastní implementací.

Po vymezení architektury dostal stejný agent roli orchestrátora. Místo toho, aby celý systém implementoval sekvenčně sám, rozděloval dílčí práci mezi subagenty, přebíral jejich výsledky a skládal je zpět vůči společnému cíli. Praktická implementace tak přímo použila princip koordinátora a subagentů popsaný v teoretické části.

Počáteční rozsah byl záměrně omezen na nejmenší uzavřený proces, který dokáže přijmout požadavek, předat práci agentovi a vrátit výsledek do řízeného procesu na GitHubu. Smyslem bylo co nejrychleji dosáhnout funkčního základu, který už může podporovat vlastní další vývoj.

Před vznikem této základní verze musel člověk agenta spouštět a řídit přímo. Po dokončení základního cyklu už DarkFactory dokáže stejné nástroje spouštět sama nad vlastním repozitářem @darkfactory-d576ec8f. Další funkce tak mohou vznikat postupně prostřednictvím stejného procesu.

Tento způsob vzniku sám o sobě nedokazuje vyšší kvalitu agentem vytvořeného softwaru. Ukazuje však, že principy plánování, orchestrace a delegace použité uvnitř DarkFactory byly použity už při vzniku její první funkční podoby.
