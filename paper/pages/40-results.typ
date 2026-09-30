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

#heading(level: 2)[Zjištění a diskuse] <zjiisteni>

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

Otázka zní, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci. Odpověď
nechť leží v pojmech, které teoretická část už zavedla: kontext, brána a druh jejího rozhodnutí.

První podmínka říká, že **kontext, na kterém běh stojí, musí ležet mimo model**. Kontextové okno
je pracovní kontext jednoho volání a jeho schopnost využívat podstatné informace s délkou klesá;
kompakce pak starší průběh nahradí souhrnem. Agentická práce potřebuje stav, který přežije delší
než jedno volání, a v konverzaci ho nemá.

Druhá podmínka říká, že **každá brána musí vědět, jaké rozhodnutí činí, a druh toho rozhodnutí
nesmí být zaměněn**. Kontrola, kterou lze přepočítat, brána posuzovaná modelem a lidská brána
jsou tři různé věci a jednou druhou nelze nahradit. Brána, která neví, že rozhoduje, je brána,
jejíž rozhodnutí nelze přezkoumat.

Popsaná konfigurace obě podmínky splňuje a obě staví mimo model. Stav leží v issue, komentáři,
dceřiném issue, větvi a diffu — kde ho lze přečíst bez agenta. Dvě rozhodnutí před vznikem větve
patří člověku a jsou oddělená, takže plán lze odmítnout i poté, co bylo přijato jeho východisko.
Obojí je zapsáno dřív, než existuje co zkazovat.

Spolehlivost tedy nesídlí v modelu. Sídlí v tom, kam se práce zapisuje, a v tom, kdo v ní
rozhoduje. Hypotéza, že „praktická autonomie agentického systému není dána pouze schopnostmi modelu,
ale především návrhem systému, který řídí stav, nástroje, rozhodovací brány a
integraci výsledku", se potvrzuje.

Proti tomu lze namítnout, že plán i diff posuzuje model, takže spolehlivost běhu nakonec stojí
na modelu. Jenže oba texty leží mimo konverzaci a člověk je čte. Chyba v posouzení se tak projeví
jako chyba v zápisu, který je k přečtení, ne jako změna, kterou by nikdo nespatřil. Spolehlivost tu
stojí na místě zápisu a na tom, kdo rozhoduje, ne na schopnosti modelu. Průchod jako celek je
zakreslen v @fig-darkfactory-pipeline.

#heading(level: 2)[Shrnutí]

V praktické části byla implementována produkční pipeline, v níž události GitHubu spouštějí agentní
kroky v izolovaném kontejneru. Popsaná konfigurace DarkFactory poskytuje odpověď, kterou lze přečíst
přímo z pořadí kroků. Vykonaná práce musí být zapsaná mimo konverzaci, aby na ni bylo možné se podívat
bez agenta. Kritické rozhodnutí musí patřit člověku, aby je bylo možné odmítnout.

Pro další výzkum plynou tato doporučení.

Ověřit, zda podmínky platí i mimo popsanou konfiguraci — na jiném repozitáři, při jiné sadě
harnessů a při jiné sadě modelů. Závěr vychází z jedné revize a jednoho repozitáře; na jiný systém
z popisu přenést nelze.

Prověřit později, až architektura postoupí dál, zda podmínky drží i v jejím rozšíření.
