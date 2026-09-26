// 3.3 Request intake and planning.
#heading(level: 2)[Interpretace a plánování požadavku]

Výchozím bodem je issue s formulovaným požadavkem. Runner načte jeho titulek a text, vyžádá si od modelu interpretaci a zapíše výsledek jako komentář. Komentář má oddělit doslovné shrnutí požadavku, architektonický rozsah a návrh verifikace. Tím se z chatové odpovědi stane zkontrolovatelný návrh, který lze před dalším během přijmout nebo opravit.

Po schválení interpretace je workflow spuštěno znovu. Model nyní dostane schválený požadavek a sestaví implementační plán, ve kterém uvádí očekávané změny, soubory nebo oblasti repozitáře a kroky ověření. Plán se opět zobrazí v issue. Schválení je tak explicitní bránou: samotná schopnost agenta plán vytvořit neznamená oprávnění měnit kód.

Zpětná vazba člověka není součástí nového vývoje od začátku. Komentář se změnou nebo odmítnutím se předá zpět interpretaci nebo plánování, takže se opravuje rozhodnutí před vytvořením pracovní větve. Tento jednoduchý model odděluje porozumění zadání, plánování a vlastní implementaci bez potřeby složitého grafového orchestrátoru @darkfactory-d576ec8f.
