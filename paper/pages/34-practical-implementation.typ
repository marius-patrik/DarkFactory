// 3.4 Implementation and automatic review.
#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načte pracovní větev odvozenou z výchozí větve. Implementační instrukce obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně může procházet repozitář, upravovat soubory a používat nástroje nad `/workspace`; změny zůstávají izolované mimo výchozí větev.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Následně runner vytvoří commit, odešle větev a otevře draft pull request. Tím se oddělí samotná změna od jejího posouzení: implementace může být dokončena, ale pull request ještě není připraven k merge @darkfactory-d576ec8f.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff, provede deterministickou kontrolu souborů proti plánu a následně předá diff modelové revizi. Pokud review najde chyby, chybějící testy, nevhodný rozsah nebo jiný problém, runner zveřejní nález a spustí nový GitHub Actions běh s fází opravy. Oprava změní větev a spustí další review. Smyčka pokračuje, dokud review nevrátí žádný akční nález; opakovaný stejný nález bez progresu se naopak označí jako zablokovaný stav @darkfactory-d576ec8f.

Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Teprve když jsou čisté obě kontroly, je draft pull request označen jako připravený k lidské revizi. Tento krok je důležitý, protože automatická revize může skončit bez nálezu, aniž by sama zaručila, že implementace odpovídá původnímu zadání.
