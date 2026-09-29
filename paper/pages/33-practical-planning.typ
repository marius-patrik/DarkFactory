// 3.3 Request intake and planning.
#heading(level: 2)[Interpretace a plánování požadavku]
Výchozím bodem je issue s formulovaným požadavkem. Požadavek se však nevytváří jako
volný text: repozitář nabízí předlohu, která vyžaduje vyplnit několik polí, a právě
ta určují, co pipeline dostane.

// Shaped like the GitHub issue form rather than a data grid: the field name reads as a
// label, the filled value sits in a bordered box like a form field, and required fields
// are marked on the label instead of taking a column of their own.
//
// The columns are fixed fractions, not `auto` and `1fr`. An `auto` column sizes itself to
// its content, and the content of the first column is a `field` block of `width: 100%`,
// which is circular: `auto` took almost the whole text width and left the second column
// one character wide, so the value rendered one letter per line. Fractions have no such
// dependency, and the table then fits under the heading instead of jumping a page.
#let field(body) = block(
  stroke: 0.5pt + luma(72%),
  radius: 3pt,
  inset: (x: 5pt, y: 4pt),
  width: 100%,
  body,
)
#let req(name) = [#strong[#raw(name)] #text(size: 8pt, fill: luma(45%))[povinné]]
#figure(
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
    // The real request skipped the form and wrote free text, so its block spans the
    // whole width rather than pretending to sit in the value column.
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
  caption: [Předloha požadavku a nejstarší požadavek projektu, issue #727 z 20. září 2026. Předloha
  má šest polí, z nichž tři povinná, ale požadavek, který pipeline zpracovala jako první, předlohu
  nevyplnil: napsal volně, pod nadpisy `Problem` a `Contract`. Runner předává modelu titulek i
  tělo issue, takže právě to rozhoduje, co se do zadání dostane @darkfactory-d576ec8f.],
) <fig-issue-template>

Příklad je záměrně malý a měřitelný: rozsah se vejde do jednoho kontextového okna a
podmínky dokončení lze přepsat na testy. To nejsou náročky pipeline, ale podmínky,
za kterých je nasazení vůbec smysluplné — a právě proto je předloha součástí popisu.
Je tu ale i věc, kterou předloha neumí: přijaté akceptační podmínky jsou text, který
vstupuje do kontextu, a nikdo je v popsané revizi nepřevádí na spustitelnou kontrolu.
Podmínka, kterou nelze spustit, se při prokazování chová stejně jako podmínka, která
neplatí.

Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělovat doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit. Na rozdíl od prostého chatu je tu interpretace artefakt, který přežije běh a dá se k němu vrátit.

Po schválení interpretace je workflow spuštěno znovu a runner založí #emph[child] issue s názvem začínajícím na `Plan:`, nativně propojené s původním issue. Model dostane schválený požadavek a sestaví implementační plán s očekávanými změnami, soubory nebo oblastmi repozitáře a kroky ověření. Plán se opět zobrazí v issue a schvaluje se samostatně. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód. Obě brány před vznikem větve jsou lidské, a protože jsou oddělené, lze schválit porozumění zadání a odmítnout plán, který z něj vychází.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-d576ec8f, což je volba, již literatura připouští jako legitimní: paralelní práce je užitečná tam, kde na sobě úlohy nezávisí, a jinde je to jen zdroj sporu @openai-agent-orchestration.
