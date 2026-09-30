// 3.4 End-to-end request flow.
#heading(level: 2)[Průchod požadavku systémem] <darkfactory-request-flow>

Praktický průchod začíná vytvořením issue s uživatelským požadavkem. Repozitář pro něj nabízí předlohu se
šesti poli, z nichž tři jsou povinná. Vedle doslovného znění požadavku se uvádí oblast a typ změny; další
kontext nebo navržená kritéria přijetí jsou volitelná @darkfactory-d576ec8f. Strukturu předlohy shrnuje
@fig-issue-template.

#let field(body) = block(
  stroke: 0.5pt + luma(72%),
  radius: 3pt,
  inset: (x: 5pt, y: 4pt),
  width: 100%,
  body,
)
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
      [#text(size: 9pt, fill: luma(35%))[Pole předlohy issue]],
    ),
    req("Verbatim User Request"),
    req("Area / Component"),
    req("Request Type"),
    opt("Parent Epic"),
    opt("Proposed Acceptance Criteria"),
    opt("Additional Context"),
  ),
  caption: [Pole předlohy issue pro uživatelský požadavek: tři jsou povinná a tři volitelná
  @darkfactory-d576ec8f.],
) <fig-issue-template>

Runner načte požadavek a předá jej modelu k interpretaci. Výsledek zapíše jako komentář k issue a další fáze
čeká na lidské schválení. Tím se odděluje otázka, zda agent zadání pochopil, od otázky, jak jej bude
implementovat. Teprve po schválení interpretace runner vytvoří propojené child issue typu `Plan:`, ve kterém
agent sestaví implementační plán. Plán vymezuje očekávané změny, dotčené části repozitáře a způsob ověření.
Také tento krok vyžaduje lidské schválení před vznikem pracovní větve @darkfactory-d576ec8f.

Po schválení plánu runner vytvoří nebo obnoví pracovní větev a předá coding agentovi schválený plán spolu s
omezením jeho rozsahu. Harness pracuje přímo nad checkoutnutým repozitářem, upravuje soubory a používá
nástroje dostupné uvnitř kontejneru. Po implementaci runner spustí dostupné formátovací a testovací příkazy.
Jejich výstup je součástí dalšího agentního kroku `fix`, takže zjištěný problém může být opraven ještě před
další revizí. Poté je změna uložena do commitu, větev odeslána a otevřen draft pull request
@darkfactory-d576ec8f.

Na draft pull requestu pokračuje automatická review smyčka. Model obdrží aktuální diff a stav větve, hledá
konkrétní problémy a případný nález vrací do opravného běhu. Současně se nad větví znovu spouští CI. Smyčka
je omezená na tři iterace, aby agent nemohl spotřebovávat prostředky bez konce. Pokud ani poslední iterace
neskončí čistým verdiktem, runner přesto pokračuje k následující kontrole souladu s plánem
@darkfactory-d576ec8f. Pokud revize vyžaduje změnu mimo schválený plán, runner ji zapíše jako
`Plan Deviation` s odůvodněním místo toho, aby ji skryl uvnitř implementace.

Po automatické revizi následuje samostatná kontrola souladu výsledného diffu se schváleným plánem. Jde o jiný
modelový dotaz než běžná code review: neposuzuje obecnou kvalitu změny, ale zda implementace odpovídá tomu,
co člověk předem schválil. Teprve po úspěšném dokončení této fáze může být výsledek předán k lidské revizi
@darkfactory-d576ec8f.

#figure(
  image("/components/img/darkfactory-pipeline.svg", width: 100%),
  caption: [Průchod požadavku DarkFactory: interpretace a plánování jsou odděleny lidskými bránami,
  implementace probíhá na pracovní větvi a draft pull request prochází automatickou revizí a kontrolou
  souladu s plánem před lidským přijetím výsledku @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Člověk může na pull requestu změnu schválit nebo vrátit zpětnou vazbu. Změnový požadavek spustí opravný běh
na stejné větvi; agent dostane původní plán, konkrétní připomínku a aktuální stav implementace, provede úpravu
a vrátí výsledek znovu do automatické revize. Není tedy nutné zakládat nový požadavek pokaždé, když lidská
revize odhalí problém @darkfactory-d576ec8f.

Konečné schválení zpracovává samostatné workflow. Po ověření autorizovaného aktéra a splnění požadovaných
podmínek převede pull request do stavu připraveného ke sloučení a provede merge s odstraněním pracovní větve.
Celý průchod tak střídá tři druhy kroků: otevřený inženýrský úsudek modelu, deterministickou automatizaci
a explicitní lidská rozhodnutí v bodech, kde se mění záměr nebo přijímá výsledek @darkfactory-d576ec8f.
