// 3.3 Request intake and planning.
#heading(level: 2)[Interpretace a plánování požadavku]

Výchozím bodem je issue s formulovaným požadavkem. Repozitář nabízí předlohu, která vyžaduje
vyplnit šest polí, z nichž tři povinná. Právě ta určují, co pipeline dostane
@fig-issue-template @darkfactory-d576ec8f.

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
  caption: [Pole předlohy issue pro uživatelský požadavek: tři jsou povinná, tři
  volitelná @darkfactory-d576ec8f.],
) <fig-issue-template>

Runner načte titulek a text issue, vyžádá si od modelu interpretaci a zapíše výsledek jako
komentář. Komentář odděluje doslovné shrnutí požadavku, architektonický rozsah a návrh
verifikace.

Po schválení interpretace je workflow spuštěno znovu, runner založí #emph[child] issue typu
`Plan:` propojené s původním issue. Model dostane
schválený požadavek a sestaví implementační plán s očekávanými změnami, soubory nebo
oblastmi repozitáře a kroky ověření. Obě brány před vznikem větve jsou lidské a protože jsou oddělené, lze schválit
porozumění zadání a odmítnout plán, který z něj vychází @darkfactory-d576ec8f.

Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se
opravuje rozhodnutí před vytvořením pracovní větve. Tento model odděluje porozumění
zadání, plánování a vlastní implementaci @darkfactory-d576ec8f.

