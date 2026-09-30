// 3.1 Methodology.
#heading(level: 2)[Metodika] <practical-first>

Praktická část má podobu inženýrské případové studie systému DarkFactory, konkrétní GitHub-native realizace širšího vzoru softwarové továrny popsaného v teoretické části. Cílem není měřit obecnou úspěšnost jazykových modelů ani porovnávat konkrétní coding agenty, ale na jednom reálném systému ukázat, jak se principy popsané v teoretické části propojují v produkčním vývojovém procesu.

Popis implementace a následná zjištění se vztahují ke konkrétní revizi DarkFactory `d576ec8f` @darkfactory-d576ec8f. Tím je případová studie oddělena od pozdějšího vývoje systému a jednotlivá tvrzení lze vztáhnout ke stejnému stavu repozitáře. Analýza vychází ze zdrojového kódu, GitHub Actions workflow, agentního runneru, registru harnessů, projektových pravidel a dokumentační konfigurace této revize.

Postup případové studie navazuje na teoretickou část. Nejprve jsou v současných zdrojích vymezeny opakující se principy agentického vývoje, zejména práce s kontextem a trvalým stavem, specifikace, orchestrace, rozdělení odpovědností mezi model a harness, programové kontroly a lidské rozhodovací body. Následně je u každého z nich sledováno, jak je realizován v DarkFactory, a z implementace je rekonstruován celý průchod požadavku systémem. Diskuse potom porovnává tento konkrétní případ s širším vzorem a odděleně uvádí omezení, která vyplývají ze skutečného chování zkoumané revize.

Součástí případové studie je také návrh a implementace DarkFactory pomocí komerčních coding agentů. Systém je záměrně jednoduchý a jeho počáteční podoba slouží jako bootstrap: již dokáže sama spouštět a řídit coding agenty a vytváří tak základ, který lze pomocí stejného procesu dále rozvíjet. Praktická část proto vedle výsledné architektury sleduje i způsob, jakým se v jednom vývojovém procesu doplňují coding agent, harness, programová orchestrace a člověk.
