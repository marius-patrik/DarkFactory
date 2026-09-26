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
      [*Pole předlohy*], [*Povinné*], [*Vyplněný požadavek, který spustil běh*],
    ),
    [Verbatim User Request],
    [ano],
    [„Když review opakovaně nachází to samé, běh se zablokuje. Chtěl bych, aby se po třech neúspěších zastavil a napsal to výslovně do issue."],
    [Area / Component],
    [ano],
    [`ci` — GitHub Actions, kontejner, runner],
    [Request Type],
    [ano],
    [`feat`],
    [Acceptance Criteria],
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

Příklad je záměrně malý a měřitelný: rozsah se vejde do jednoho kontextového okna,
podmínky dokončení jsou pozorovatelné a lze je přepsat na testy. To nejsou
náročky pipeline, ale podmínky, za kterých je nasazení vůbec smysluplné —
a právě proto je předloha součástí popisu, nikoli jen volný text v issue.

Výchozím bodem je issue s formulovaným požadavkem. Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělit doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit.

Po schválení interpretace je workflow spuštěno znovu. Model nyní dostane schválený požadavek a sestaví implementační plán, ve kterém uvádí očekávané změny, soubory nebo oblasti repozitáře a kroky ověření. Plán se opět zobrazí v issue. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-d576ec8f.
