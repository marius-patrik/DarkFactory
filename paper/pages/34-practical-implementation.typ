// 3.4 Implementation and automatic review.
#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načle pracovní větev odvozenou z výchozí větve. Implementační instrukce
obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně prochází
repozitář, upravuje soubory a používá nástroje nad `/workspace`; změny zůstávají izolované mimo výchozí větev.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá
výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Testovací sady se
přitom spouštějí pouze jednou a po opravě už ne: kód se zformátuje, zakomituje a odešle dál, i kdyby opravená
verze stále neprocházela. Opakovatelná kontrola tedy rozliší dobrý a špatný stav, ale není překážkou. Změna
s neprocházejícími testy se dostane do draft pull requestu stejně jako změna procházející. Runner následně vytvoří
commit, odešle větev a otevře draft pull request @darkfactory-d576ec8f.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff a předá je
modelové revizi, zatímco průběžná integrace znovu spustí tytéž nástroje. Nalezený problém runner zveřejní a spustí
nový běh s fází opravy, která změní větev a spustí další review. Nález vyžadující zásah mimo plán se neodmítne:
runner jej zapíše jako Plan Deviation s odůvodněním na původním issue a plán tím doplní. Schválený plán tedy není
neměnný, ale každá jeho změna je zapsaná a odůvodněná.

Smyčka však může skončit bez jakéhokoli verdiktu a bez komentáře. Pull request zůstane ve stavu draft a nikdo
zvenčí nepozná, zda review prošlo, nebo se jen zastavilo. Jediným stavem, který v této revizi znamená zablokování,
je vyčerpaná kvóta — tehdy se zapíše kontrolní bod, stav na projektové tabuli a komentář s výzvou k obnovení
@darkfactory-d576ec8f.

Požadavek, který tuto meze odhalil, žádá, aby se běh po opakováních stejného nálezu zastavil a napsal to
výslovně do issue. Popsaná revize to neumí, ačkoli je podmínka zastavení v té dokumentaci uvedena výslovně
@openai-goals.

Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Ani ta není porovnáním sad
souborů: je to druhý dotaz modelu, tentokrát na shodu s textem plánu. Teprve když oba dotazy vyjdou bez nálezu, je
draft pull request označen jako připravený k lidské revizi. Dodavatelé tento typ hodnotitele popisují stejně
omezeně @claude-goal, a je proto s první branou rovnocenný, ne její náhradou.
