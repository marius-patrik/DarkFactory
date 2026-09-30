#import "../components/terms.typ": term, term-name

#heading(level: 2)[Průchod požadavku systémem] <darkfactory-request-flow>

Průchod začíná vytvořením #term("Issue", cs: "požadavek", definition: "Jednotka práce v GitHubu, která uchovává zadání, diskusi a průběžný stav.") s uživatelským zadáním. Repozitář nabízí předlohu se šesti poli, z nichž tři jsou povinná @darkfactory-d576ec8f. Strukturu shrnuje @fig-issue-template.

#let req(name) = [#strong[#raw(name)] #text(size: 8pt, fill: luma(45%))[povinné]]
#let opt(name) = [#strong[#raw(name)] #text(size: 8pt, fill: luma(45%))[volitelné]]

#figure(
  kind: table,
  table(
    columns: (1fr,),
    align: left,
    inset: (x: 6pt, y: 5pt),
    stroke: none,
    table.header(
      [#text(size: 9pt, fill: luma(35%))[Pole předlohy požadavku]],
    ),
    req("Verbatim User Request"),
    req("Area / Component"),
    req("Request Type"),
    opt("Parent Epic"),
    opt("Proposed Acceptance Criteria"),
    opt("Additional Context"),
  ),
  caption: [Pole předlohy požadavku @darkfactory-d576ec8f.],
) <fig-issue-template>

Řídicí skript předá zadání modelu k interpretaci a výsledek zapíše jako komentář. Po lidském schválení vznikne propojený plánovací požadavek `Plan`, ve kterém agent připraví implementační plán. Také plán musí člověk schválit před vznikem pracovní větve @darkfactory-d576ec8f.

Po schválení plánu vznikne nebo se obnoví pracovní větev. Agent provede změny v izolovaném prostředí a řídicí skript následně spustí dostupné formátovací a testovací příkazy. Při neúspěchu dostane agent jeden opravný krok. Poté se změna uloží do commitu, větev se odešle a otevře se koncept #term("Pull Request", cs: "požadavek na sloučení", definition: "Návrh změny v repozitáři, který spojuje diff, automatické kontroly a lidskou revizi.") @darkfactory-d576ec8f.

Nad požadavkem na sloučení pokračuje automatická revizní smyčka. Model hledá konkrétní problémy a nález vrací do opravného běhu. Současně se nad větví spouští #term("Continuous Integration", cs: "průběžná integrace", definition: "Automatické spuštění kontrol nad změnou před jejím začleněním do hlavní větve."). Smyčka je omezena na tři iterace. Pokud ani poslední iterace neskončí čistým verdiktem, proces pokračuje ke kontrole souladu s plánem @darkfactory-d576ec8f.

Samostatný modelový krok následně posoudí, zda výsledná změna odpovídá schválenému plánu. Po úspěšném dokončení této kontroly může být změna předána člověku. Celý průchod shrnuje @fig-darkfactory-pipeline.

#figure(
  image("/components/img/darkfactory-pipeline.svg", width: 100%),
  caption: [Průchod požadavku DarkFactory @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Člověk může změnu schválit nebo vrátit zpětnou vazbu. Požadavek na úpravu spustí další opravný běh na stejné větvi. Konečné schválení zpracuje samostatný pracovní postup, který po splnění podmínek provede sloučení a odstraní pracovní větev @darkfactory-d576ec8f.

Celý proces tak střídá modelový úsudek, deterministickou automatizaci a explicitní lidská rozhodnutí.
