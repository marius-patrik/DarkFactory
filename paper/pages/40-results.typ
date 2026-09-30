// 4.1 Findings and discussion.
//
// STUBBED pending this rewrite. Every admission the practical part used to carry
// is now gone from chapter 3 by the author's direction, so this section is the only
// place left where the system is allowed to be judged. Findings and limits share
// one section, deliberately: a finding without its limit reads as advocacy.
//
// Order: the findings first, in the order the run happens, then what they do
// not show, then the interpretation, then the three named limitations.
//   Findings 1-4, then one negative finding — it stays, it is the reason the rest
//   can be read as measurement rather than marketing.
//   Then: the run can stop without a recorded verdict; repeatable checks are a
//   signal, not a barrier; simplicity has a cost in coverage and in dependence.
//   Then three limits: ownership (the loop is a foreign harness), scope (the
//   runner calls foreign harnesses for every agentic step), layer composition
//   (two harness layers, which one's conventions dominate).
// Closing: the conclusions are defended from the first limit. The thesis claim —
// structure, not the choice of CLI — is stated once, in 4.1 or 4.2, not twice.
//
// Answers the research question, which now asks under what conditions the
// system does the work reliably. Answer in prose (R15). Do not grade the system
// against a list; the list was deleted.
#heading(level: 1)[Závěr]

#heading(level: 2)[Zjištění a diskuse]

Krok, na kterém stojí krok následující, nezůstává v konverzaci. Požadavek je issue, porozumění
zadání komentář, plán child issue s typem `Plan:`, hotová práce větev s diffem a schválení
zaznamenaný stav pull requestu. Člověk si všechny z nich přečte v repozitáři, kam se dostane bez
jediného dotazu na agenta. Runner přijme událost a převede ji na právě jeden agentní krok, rozhodne,
kam událost směřuje, zpracuje její výstup a vyvolá další. Git drží stav, výpočet poskytují GitHub
Actions @fig-darkfactory-architecture @darkfactory-d576ec8f. Přihlašovací údaje do repozitáře
nepatří; do kontejneru jdou přes GitHub Secrets.

Omezení je i na úrovni workflow. Job ověří, zda je agent pro daný repozitář povolen, a odfiltruje
automatické komentáře, aby si výstup nevytvářel další události. Kde systém smí běžet, je tedy
napsáno mimo model.

Druhé zjištění se týka dvou rozhodnutí, která padají před vznikem větve. Člověk nejprve schválí
porozumění požadavku a plán schvaluje zvlášť. Předloha navíc vyžaduje šest polí, z nichž tři
povinná, a právě ty určují, co pipeline dostane @fig-issue-template. Brány jsou lidské a oddělené,
takže plán lze odmítnout i poté, co bylo přijato jeho východisko @darkfactory-d576ec8f. Komentář
se změnou nebo odmítnutím se vrací do interpretace nebo do plánování, takže brána není slepý bod:
rozhodnutí se opravuje dřív, než vznikne větev.

Po druhé bráně už není co rozhodovat. Větev se vytvoří nebo načte, harness projde repozitář,
spustí se formátovací nástroje a deklarované testovací sady, následuje commit, push a draft pull
request. Tento úsek neobsahuje úsudek modelu.

Model je v této konfiguraci položka konfigurace, nikoli součást struktury. Každý harness je zapsán
deklarativně: binář, způsob, jak se z promptu sestaví příkazová řádka, a způsob přihlášení.
V registru je osm harnessů v konfigurovatelném pořadí a chybějící binář se přeskočí, místo aby běh
zabrál. Jeden obraz vzniká z jedné definice, takže výměna modelu je změna dat, ne změna kódu
@darkfactory-d576ec8f. Dostupná sada modelů tak závisí na tom, co je v obrazu.

Ve zbytku běhu naopak nic volání modelu nenahrazuje. Plán posuzuje dotaz na model a stejně tak
výsledný diff. Po čisté revizi následuje kontrola souladu diffu se schváleným plánem, což je
druhý dotaz na model. Spolehlivost v tomto úseku je právě tak nejistá, jako je nejisté to, co
posuzuje.

Konec běhu už žádné rozhodnutí neobsahuje. Draft pull request se převede do stavu připraveného,
workflow zkontroluje schválení, provede merge a větev po sloučení odstraní. Výsledkem je změna
v repozitáři, kterou lze přečíst bez znalosti průběhu.

Konfigurace ale několik věcí nezaručuje. Schválený plán není hranicí. Hranice je zadána jen textem:
implementační instrukce nese plán, omezení na jeho rozsah a pravidla pro testy a dokumentaci, a
zakazuje sahat mimo něj. Nález revize, který plán překročí,
se proto neodmítne, ale zapíše se jako Plan Deviation s odůvodněním na původním issue, doplní plán
a pustí opravu. K bráně, která plán schválila, se běh nevrátí. Změnový požadavek na pull requestu
spustí opravný běh na téže větvi; agent přitom obdrží plán, konkrétní zpětnou vazbu a aktuální
kontext větve, ale běh se vrátí do review smyčky, nikoli k plánu.

Poslední brána zase oprávnění nekontroluje. Aktéra porovnává s jedním pevně zapsaným účtem,
vlastníkem repozitáře. Neověřuje se autor issue ani úroveň oprávnění.

#heading(level: 3)[Odpověď na výzkumnou otázku]

Otázka zní, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci. Popsaná
konfigurace odpovídá dvěma podmínkám.

První podmínka říká, že každý krok, který umožňuje krok následující, je zapsaný mimo konverzaci.
Není potřeba si nic pamatovat, protože je to uložené. Není potřeba nic vysvětlovat, protože je to
čitelné. Podmínka vylučuje práci, která existuje jen jako text v okně modelu.

Druhá podmínka říká, že dvě rozhodnutí před vznikem větve patří člověku, a patří mu odděleně.
Člověk může přijmout porozumění zadání a plán, který z něj vychází, přesto odmítnout. Oba body jsou
přitom zapsány dřív, než existuje co zkazovat. Podmínka vylučuje systém, v němž rozhoduje kód
nebo samotný model.

Obě podmínky mají svůj protějšek. Kdyby práce zůstala v konverzaci, stačil by jeden člověk, který
si pamatuje. Kdyby o plánu rozhodoval model, stačilo by, že se model vyjádří.

Spolehlivost tedy nesídlí v modelu. Sídlí v tom, kam se práce zapisuje, a v tom, kdo v ní
rozhoduje. Hypotéza, že „praktická autonomie je vlastností návrhu systému, který práci řídí, a
nikoli vlastností modelu, který v něm pracuje", se potvrzuje.

#heading(level: 3)[Hranice platnosti]

Tvrzení platí pro jednu revizi, jeden repozitář a jednu sadu modelů. Přenos na jiný repozitář nebo
jinou sadu modelů z popisu neplyne.

Rozsah závěru je užší, než obě podmínky společně naznačují. Potvrzeno je, že práce je zapsaná a
že dvě rozhodnutí patří člověku. Není potvrzeno, že schválený plán práci ohraničuje, ani že jeho
změny procházejí novým schválením.

Spolehlivě zde neznamená, že změna je správná. Znamená to, že je zapsaná a že se dá přečíst bez
agenta.

Proti tomu lze namítnout, že plán i diff posuzuje model, takže spolehlivost běhu nakonec stojí na
modelu. Jenže oba texty leží mimo konverzaci a člověk je čte. Chyba v posouzení se tak projeví jako
chyba v zápisu, který je k přečtení, ne jako změna, kterou by nikdo nespatřil. Spolehlivost tu stojí
na místě zápisu a na tom, kdo rozhoduje, ne na schopnosti modelu. Průchod jako celek je zakreslen
v @fig-darkfactory-pipeline.

Cíl práce byl ověřit, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci. Cíl
byl dosažen a hypotéza se potvrdila. V praktické části byla implementována produkční pipeline, v níž
události GitHubu spouštějí agentní kroky v izolovaném kontejneru. Popsaná konfigurace DarkFactory
poskytuje odpověď, kterou lze přečíst přímo z pořadí kroků. Vykonaná práce musí být zapsaná mimo
konverzaci, aby na ni bylo možné se podívat bez agenta. Dvě rozhodnutí před vznikem větve musí patřit
člověku, aby je bylo možné odmítnout. Praktická autonomie je v tomto systému vlastností návrhu, který
práci řídí, a nikoli vlastností modelu, který v něm pracuje.

Pro další výzkum plyne čtyř doporučení.

Předně ověřit, zda podmínky platí i mimo popsanou konfiguraci — na jiném repozitáři, při jiné sadě
harnessů a při jiné sadě modelů. Dnešní odpověď je sázena na jednu revizi a na jeden repozitář;
přenos na jiný systém z popisu neplyne.

Dále prozkoumat, zda lze dosáhnout toho, aby plán byl hranicí, tak že se změna rozsahu vrátí k
lidskému schválení. Dnes se změna zapíše jako odůvodněná odchylka a k bráně se běh nevrátí.

Dále opřít poslední bránu o oprávnění v repozitáři, ne o porovnání s jedním účtem, aby záznam o
schválení odpovídal tomu, kdo skutečně rozhodl. Dnes se aktér porovnává s vlastníkem repozitáře.

Nakonec posoudit architekturu znovu až za ní, až se posune z revize zde popsané, a zjistit, zda
podmínky vydrží její rozšíření.
