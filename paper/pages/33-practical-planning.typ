// 3.3 Request intake and planning.
#heading(level: 2)[Interpretace a plánování požadavku]

Výchozím bodem je issue s formulovaným požadavkem. Požadavek se však nevytváří jako
volný text: repozitář nabízí předlohu, která vyžaduje vyplnit několik polí, a právě
ta určují, co pipeline dostane. @fig-issue-template uvádí předlohu i vyplněný
požadavek, který odpovídá jednomu běhu popsanému v této kapitole.

#figure(
  table(
    columns: (auto, auto, 1fr),
    align: (left, center, left),
    table.header(
      [#emph[Pole předlohy]], [#emph[Povinné]], [#emph[Vyplněný požadavek, který spustil běh]],
    ),
    [Verbatim User Request],
    [ano],
    [„Když review opakovaně nachází to samé, běh se zablokuje. Chtěl bych, aby se po třech neúspěších zastavil a napsal to výslovně do issue.“],
    [Area / Component],
    [ano],
    [`ci` — GitHub Actions, kontejner, runner],
    [Request Type],
    [ano],
    [`feat`],
    [Proposed Acceptance Criteria],
    [ne],
    [☐ Běh skončí po třetím opakování stejného nálezu.
     ☐ Do issue vznikne komentář s počtem pokusů.
     ☐ Test pokrývá nové ukončení.
     ☐ `bun run check` projde bez chyb.],
    [Additional Context],
    [ne],
    [`block on repeated finding` — tři po sobě jdoucí běhy skončily stavem `blocked` bez změny nálezu.],
  ),
  caption: [Předloha požadavku a příklad jejího vyplnění. Runner předává modelu titulek a tělo issue; pole předlohy tedy určují, co se do zadání dostane @darkfactory-d576ec8f.],
) <fig-issue-template>

Příklad je záměrně malý a měřitelný: rozsah se vejde do jednoho kontextového okna a
podmínky dokončení lze přepsat na testy. To nejsou náročky pipeline, ale podmínky,
za kterých je nasazení vůbec smysluplné — a právě proto je předloha součástí popisu.
Je tu ale i věc, kterou předloha neumí: přijaté akceptační podmínky jsou text, který
vstupuje do kontextu, a nikdo je v popsané revizi nepřevádí na spustitelnou kontrolu.
Podmínka, kterou nelze spustit, se při prokazování chová stejně jako podmínka, která
neplatí.

Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělit doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit. Na rozdíl od prostého chatu je tu interpretace artefakt, který přežije běh a dá se k němu vrátit.

Po schválení interpretace je workflow spuštěno znovu a runner založí #emph[dítě] issue s názvem začínajícím na `Plan:`, nativně propojené s původním issue. Model dostane schválený požadavek a sestaví implementační plán s očekávanými změnami, soubory nebo oblastmi repozitáře a kroky ověření. Plán se opět zobrazí v issue a schvaluje se samostatně. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód. Obě brány před vznikem větve jsou lidské, a protože jsou oddělené, lze schválit porozumění zadání a odmítnout plán, který z něj vychází.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-d576ec8f, což je volba, již literatura připouští jako legitimní: paralelní práce je užitečná tam, kde na sobě úlohy nezávisí, a jinde je to jen zdroj sporu @openai-agent-orchestration.
