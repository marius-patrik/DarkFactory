#import "../components/terms.typ": term-name

#heading(level: 2)[Metodika] <practical-first>

Praktická část má podobu inženýrské případové studie systému DarkFactory, konkrétní realizace širšího vzoru softwarové továrny nativně postavená na GitHubu. Cílem není měřit obecnou úspěšnost jazykových modelů ani porovnávat konkrétní agenty, ale na jednom reálném systému ukázat, jak se principy popsané v teoretické části propojují v produkčním vývojovém procesu.

Popis implementace a následná zjištění se vztahují ke konkrétní revizi DarkFactory `d576ec8f` @darkfactory-d576ec8f. Analýza vychází ze zdrojového kódu, pracovních postupů GitHub Actions, řídicího skriptu, registru agentních vrstev, projektových pravidel a dokumentační konfigurace této revize.

Postup případové studie navazuje na teoretickou část. Nejprve jsou vymezeny opakující se principy agentického vývoje a následně je sledováno, jak jsou realizovány v DarkFactory. Z implementace je rekonstruován celý průchod požadavku systémem a diskuse potom odděleně shrnuje zjištění a omezení konkrétní revize.

DarkFactory byla implementována pomocí komerčních #term-name("Coding Agents", cs: "coding agenti"). Počáteční podoba je záměrně jednoduchá a slouží jako počáteční základ, který již dokáže stejné agenty spouštět a řídit. Praktická část proto sleduje nejen výslednou architekturu, ale také způsob, jakým se v jednom procesu doplňují agent, agentní vrstva, programová orchestrace a člověk.
