// 3.4 Implementation and automatic review.
//
// Two of the four corrections live here, and both are stated as properties of the
// described revision rather than as a list of fixes: the review loop is bounded at three
// iterations and can end without a verdict, and the deterministic check runs once and
// therefore reports rather than blocks.
#heading(level: 2)[Implementace a automatická revize]

Po schválení plánu runner vytvoří nebo načte pracovní větev odvozenou z výchozí větve. Implementační instrukce obsahuje schválený plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci. Harness následně může procházet repozitář, upravovat soubory a používat nástroje nad `/workspace`; změny zůstávají izolované mimo výchozí větev.

Po implementaci runner spustí dostupné formátovací nástroje a deklarované testovací sady. Při neúspěchu předá výstup kontroly agentnímu kroku `fix`, který má opravit chybu bez opuštění schváleného rozsahu. Testovací sady se přitom spouštějí pouze jednou a po opravě už ne: kód se zformátuje, zakomituje a odešle dál, i kdyby opravená verze stále neprocházela. Opakovatelná kontrola tedy rozliší dobrý a špatný stav, ale není překážkou — změna s neprocházejícími testy se dostane do draft pull requestu stejně jako změna procházející. Následně runner vytvoří commit, odešle větev a otevře draft pull request, čímž se změna oddělí od svého posouzení: implementace může být dokončena, ale pull request ještě není připraven k merge @darkfactory-d576ec8f.

Na draft pull requestu začíná automatická review smyčka. Každá iterace načte aktuální větev a diff a předá jej modelové revizi, zatímco průběžná integrace znovu spustí tytéž nástroje. Nalezený problém runner zveřejní a spustí nový běh s fází opravy, která změní větev a spustí další review. Nález vyžadující zásah mimo plán se neodmítne: runner jej zapíše jako Plan Deviation s odůvodněním na původním issue a plán tím doplní. Schválený plán tedy není neměnný, ale každá jeho změna je zapsaná a odůvodněná. Smyčka je ohraničena nejvýše třemi iteracemi a oprava, která větev nezmění, ji ukončí dřív. Po vyčerpání tří iterací však smyčka skončí bez jakéhokoli verdiktu a bez komentáře, pull request zůstane ve stavu draft a nikdo zvenčí nepozná, zda review prošlo, nebo se jen zastavilo. Jediným stavem, který v této revizi znamená zablokování, je vyčerpaná kvóta — tehdy se zapíše kontrolní bod, stav na projektové tabuli a komentář s výzvou k obnovení @darkfactory-d576ec8f.

@fig-issue-template ukazuje požadavek podaný právě kvůli této meze: žádá, aby se běh po třech opakováních stejného nálezu #emph[zastavil a napsal to výslovně do issue]. Popsaná revize to neumí, ať žádá o třetí opakování, ačkoli je podmínka zastavení v té dokumentaci uvedena výslovně @openai-goals.

Po čisté review ještě proběhne kontrola souladu výsledného diffu se schváleným plánem. Ani ta není porovnáním sad souborů: je to druhý dotaz modelu, tentokrát na shodu s textem plánu. Teprve když oba dotazy vyjdou bez nálezu, je draft pull request označen jako připravený k lidské revizi. Je důležitý: automatická revize může skončit bez nálezu, aniž by zaručila, že implementace odpovídá zadání, a posuzuje přitom plán, jehož text napsal tentýž model. Dodavatelé tento typ hodnotitele popisují stejně omezeně @claude-goal, a je proto s první branou rovnocenný, ne její náhradou.
