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

#figure(
  kind: table,
  table(
    columns: (0.40fr, 0.60fr),
    align: (left + top, left + top),
    inset: (x: 6pt, y: 5pt),
    stroke: none,
    table.header(
      [#text(size: 9pt, fill: luma(35%))[Pole předlohy issue]],
      [#text(size: 9pt, fill: luma(35%))[Jak to vypadá v issue #727]],
    ),
    req("Verbatim User Request"),
    field[#strong[restore the agent container build from the checked-in Bun lock owner]],
    req("Area / Component"),
    field[`area:ci`],
    req("Request Type"),
    field[`bug`],
    table.cell(colspan: 2)[
      #text(size: 9pt, fill: luma(35%))[ místo vyplnění předlohy — co napsal požadavek #727 ]
      #v(3pt)
      #field[
        #strong[Problem] — `Dockerfile.agent` kopíruje kořenový `bun.lock`, ale repozitář
        má jen `harness/bun.lock`; běh agenta tak padá ještě před spuštěním.
        Viz `### Contract` v issue.
      ]
    ],
  ),
  caption: [Předloha issue a její vyplnění v prvním zpracovaném požadavku
  @darkfactory-d576ec8f.],
) <fig-issue-template>

Runner načte titulek a text issue, vyžádá si od modelu interpretaci a zapíše výsledek jako
komentář. Komentář odděluje doslovné shrnutí požadavku, architektonický rozsah a návrh
verifikace.

Po schválení interpretace je workflow spuštěno znovu, runner založí #emph[child] issue typu
`Plan:` propojené s původním issue. Model dostane
schválený požadavek a sestaví implementační plán s očekávanými změnami, soubory nebo
oblastmi repozitáře a kroky ověření. Plán se zobrazí v issue a schvaluje se samostatně.
Obě brány před vznikem větve jsou lidské a protože jsou oddělené, lze schválit
porozumění zadání a odmítnout plán, který z něj vychází @darkfactory-d576ec8f.

Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se
opravuje rozhodnutí před vytvořením pracovní větve. Tento model odděluje porozumění
zadání, plánování a vlastní implementaci @darkfactory-d576ec8f.

