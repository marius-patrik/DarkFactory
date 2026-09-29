// 3.1 Method.
//
// What remains here is the reproducibility record: what was built, under what conditions,
// and what the simplification costs. The sentence that named the pinned revision, and the
// sentence about source types, were both removed at the author's instruction — they
// described the paper rather than the system.
//
// The four-layer list that opened this section is gone. It named GitHub, GitHub Actions,
// the Python/Docker runner and the review loop, and then 3.2 to 3.5 described all four
// again - the list was a second, compressed edition of the chapter it introduces, which is
// how its fourth item came to contradict 3.4 (../PLAN.md, Q-E). What remains is the
// reproducibility record: the pinned revision, how the runner was built, and what the
// simplification costs. The system itself is described once, in 3.2 to 3.5.
//
// Tři kritéria is the only level-3 subsection left. The author has directed that the
// criteria be stated once in 1.2 and answered in 4.1, with 3.1.1 removed (../PLAN.md, R13
// and Q-A). That is not applied yet: what follows is the current state, and it changes when
// the author settles Q-A.
//
// The composition question used to be 3.1.2. It was cut and its one live idea became the
// third limitation in the discussion (4.2), beside ownership and scope.
//
// The criteria are this thesis's own operationalisation, not the field's taxonomy, and say
// so.
#heading(level: 2)[Metodika] <practical-first>

Praktická část implementuje záměrně jednoduchou produkční pipeline, v níž je vývojovým prostředím přímo GitHub a harness produkční coding agent. Cílem je ukázat, jak lze spojit události GitHubu, automatizované plánování, izolovanou práci v kontejneru a lidskou integraci do jednoho opakovatelného procesu.

Pythonovský runner, o kterém tato část pojednává, byl napsán pomocí týchž produkčních coding agentů, které následně popisuje. Cílem nebyla stavba co nejucelenějšího systému, ale co nejmenší uzavřená smyčka, na níž lze ukázat, jak se navzájem ovlivňují agent, harness a lidský recenzent. Pozornost je proto soustředěna na tuto interakci a na její členění, nikoli na šíři nabízených funkcí.

Systém bez vlastního stavového serveru, bez databáze a bez trvalého běžícího procesu je na první pohled méně schopný než plnohodnotná platforma. Oproti ní je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí zůstává vidět v issue, commitu nebo průběhu kontroly. Každý nový prvek pipeline byl přidán až poté, co bylo na konkrétní úloze zřejmé, že současná podoba nestačí, takže složitost rostla postupně. Samotná pipeline se stala nástrojem, kterým byla psána i její další část.


#heading(level: 3)[Tři kritéria]

Sloveso výzkumné otázky je #emph[musí] a je míněno podmíněně: nutné jsou ty principy, které samotný model bez zásady okolí neposkytne. Aby to nebylo tvrzení bez měřítka, převádí práce tuto podmíněnou nutnost na trojici kritérií, podle níž lze konkrétní systém posoudit. Jde o #emph[operacionalizaci této práce], nikoli o převzatou taxonomii: pět oborů agentického inženýrství je slovník, který používají zdroje, ale kritéria nejsou jeho podmnožinou ani překladem.

#emph[Stav leží mimo model a je zjistitelný.] Kritérium vyžaduje pojmenovat artefakt, úložiště, kde leží, a osobu, která do něj může nahlédnout, aniž by se musel ptát modelu. Stav uložený v konverzaci je také stav, ale jeho jediným čtenářem je model, který v něm pracuje.

#emph[Brány jsou výslovné a druhy jejich rozhodnutí se nerozplývají.] Kritérium vyžaduje, aby brána existovala, věděla, jaké rozhodnutí činí, a označila své rozhodnutí za druhové. Druhů jsou tři: deterministická kontrola, jejíž výsledek lze přepočítat nebo znovu spustit bez modelu; modelem hodnocená brána, která je dotazem na jiný model, a je proto stejně pravděpodobnostní jako to, co posuzuje; a lidská brána. Běh nesmí projít bránou jednoho druhu prostředky jiného: modelem hodnocená brána nenahrazí deterministickou kontrolu, protože neporovnává výsledek s tím, co se dá přepočítat, a lidská brána bránu předchozí nenahrazuje, nýbrž ji schvaluje. Toto rozdělení není vynalézeno zde; dokumentace, která popisuje vládnutí běhu, uvádí bránu, která „can run a script for deterministic checks or a prompt for model-evaluated ones“ @claude-goal, a druhou z nich odhazuje právě proto, že je pravděpodobnostní.

#emph[Člověk rozhoduje, co vstoupí do produkce.] Kritérium je formulováno jako nepodléhající vyjednávání: v popsaném systému musí existovat pojmenovaný okamžik, v němž rozhodne určený člověk o určené věci, a nesmí existovat žádná jiná cesta, která by ke stejnému bodu vedla. Podmínka „určený“ je ostrá: musí jít o osobu, kterou lze pojmenovat, nikoli o kohokoli, kdo v okamžiku klikne. Kritérium je jediné, které práce neváže na výsledek měření a neoslabuje, protože systém, který je nesplňuje, neprovádí podle ní inženýrskou práci, ale automatizovanou výrobu změn bez odpovědného člověka — a to je přesně ta věc, kterou konference v Garmischi odmítla bez důvodu @nato1969.
