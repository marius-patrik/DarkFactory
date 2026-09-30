#import "../components/terms.typ": term-name

#heading(level: 2)[Implementace pomocí #term-name("Coding Agents", cs: "coding agentů")] <darkfactory-bootstrap>

DarkFactory byla sama vyvíjena pomocí komerčních coding agentů. Člověk určoval záměr, omezení a zásadní rozhodnutí, zatímco otevřená implementační práce byla delegována agentům.

Počáteční rozsah byl záměrně omezen na nejmenší uzavřený proces, který dokáže přijmout požadavek, předat práci agentovi a vrátit výsledek do řízeného procesu na GitHubu. Cílem bylo dostat první funkční podobu do rozsahu jednoho souvislého agentního běhu a co nejrychleji dosáhnout stavu, ve kterém už může systém podporovat vlastní další vývoj.

Před vznikem této základní verze musel člověk coding agenta spouštět a řídit přímo. Po dokončení základního cyklu už DarkFactory dokáže stejné nástroje spouštět sama nad vlastním repozitářem @darkfactory-d576ec8f. Další funkce tak mohou vznikat postupně prostřednictvím stejného procesu.

Tento způsob vzniku sám o sobě nedokazuje vyšší kvalitu agentem vytvořeného softwaru. Ukazuje však, že agentický vývoj lze použít nejen jako předmět návrhu, ale i jako prostředek k dalšímu rozšiřování systému.
