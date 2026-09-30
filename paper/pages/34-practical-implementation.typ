// 3.4 Implementation and automatic review.
#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načte pracovní větev odvozenou z výchozí větve. Implementační instrukce
obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně prochází
repozitář a upravuje soubory.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá
výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Runner následně vytvoří commit, odešle větev a otevře draft pull request
@darkfactory-d576ec8f.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff a předá je
modelové revizi, zatímco průběžná integrace (CI) znovu spustí tytéž nástroje. Nalezený problém runner zveřejní a spustí
nový běh s fází opravy, která změní větev a spustí další review. Nález vyžadující zásah mimo plán se neodmítne:
runner jej zapíše jako Plan Deviation s odůvodněním na původním issue a plán tím doplní. Každá změna schváleného plánu je tedy zapsaná a odůvodněná.

Po čisté review proběhne kontrola souladu výsledného diffu se schváleným plánem. Jde o druhý dotaz modelu,
tentokrát na shodu s textem plánu. Teprve když oba dotazy vyjdou bez nálezu, je
draft pull request označen jako připravený k lidské revizi.
