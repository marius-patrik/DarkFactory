// 3.1 Method.
//
// The first four paragraphs are the reproducibility record and are carried over from the
// committed text: what was built, under what conditions, and what the simplification
// costs. The three level-3 subsections are the method proper, added so that the
// conditional `musí` of the research question has a measure and the reader can see which
// rules the work held itself to. Level 3 is used deliberately: it adds content without
// touching a single number in the outline above it.
//
// The protocol states the rule, not the list — the introduction already qualifies the
// sources once, so repeating the list here would give the reader the same paragraph
// twice. The criteria are this thesis's own operationalisation of a conditional verb and
// say so; they are not the field's taxonomy. The composition question is posed, and left
// open: the theory does not answer it and neither does the record below.
#heading(level: 2)[Metodika] <practical-first>

Praktická část implementuje záměrně jednoduchou produkční pipeline, v níž je vývojovým prostředím přímo GitHub a harness produkční coding agent. Cílem je ukázat, jak lze spojit události GitHubu, automatizované plánování, izolovanou práci v kontejneru a lidskou integraci do jednoho opakovatelného procesu.

Záznam je určen jedinou věcí: revizí repozitáře, z níž byl pořízen, a všechny popisy níže vycházejí z této revize, nikoli z jejího pozdějšího vývoje @darkfactory-d576ec8f. Bez tohoto určení by nebylo možné ověřit, zda popis odpovídá kódu, a právě na tomto místě se ukázalo, že několik dřívějších tvrzení o popsaném průběhu revizi neodpovídalo.

Předmětem analýzy jsou čtyři navazující vrstvy:
1. #emph[GitHub jako zdroj pravdy:] issue a jeho komentáře uchovávají požadavek, schválení, plán a zpětnou vazbu; větev, commit a pull request uchovávají změnu a její průběžnou revizi @github-branches @github-pull-requests.
2. #emph[GitHub Actions jako výpočetní prostředí:] jednotlivé události spouštějí krátké workflow, které provede checkout pracovní kopie repozitáře, sestaví obraz, spustí agenta a následnou integraci provede.
3. #emph[Python a Docker jako izolační vrstva:] workflow předá událost a pracovní strom pythonovskému runneru v kontejneru; runner volá harness a předává mu nástroje, přihlašovací údaje a stav úlohy.
4. #emph[Review smyčka jako podmínka integrace:] automatická revize diffu, opravy a další revize se opakují, dokud poslední nález nezmizí, v popsané revizi však nejvýše třikrát; teprve poté je pull request předán člověku.

Metodika sama se řídí tvrzením práce. pythonovský runner, o kterém tato část pojednává, byl napsán co nejjednodušeji pomocí produkčních coding agentů, tedy právě těm nástroji, které následně popisuje. Cílem nebyla stavba co nejucelenějšího systému, ale co nejmenší uzavřená smyčka, na níž lze ukázat, jak se navzájem ovlivňují agent, harness a lidský recenzent. Pozornost je proto soustředěna na tuto interakci a na její členění, nikoli na šíři nabízených funkcí.

Zjednodušení je záměrné a má svou cenu. Systém bez vlastního stavového serveru, bez databáze a bez trvalého běžícího procesu je na první pohled méně schopný než plnohodnotná platforma, oproti níž je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí zůstává vidět v issue, commitu nebo průběhu kontroly. Zároveň umožňuje zvyšovat složitost postupně: každý nový prvek pipeline byl přidán až poté, co bylo na konkrétní úloze zřejmé, že současná podoba nestačí. Samotná pipeline se tak stala nástrojem, kterým byla psána i další její část.

Druhy zdrojů a to, z čeho se v práci čerpá, jsou uvedeny v úvodu. Zde zbývá jedno pravidlo: citovat lze jen text, který autor otevřel.


#heading(level: 3)[Tři kritéria]

Sloveso výzkumné otázky je #emph[musí] a je míněno podmíněně: nutné jsou ty principy, které samotný model bez zásady okolí neposkytne. Aby to nebylo tvrzení bez měřítka, převádí práce tuto podmíněnou nutnost na trojici kritérií, podle níž lze konkrétní systém posoudit. Jde o #emph[operacionalizaci této práce], nikoli o převzatou taxonomii: pět oborů agentického inženýrství je slovník, který používají zdroje, ale kritéria nejsou jeho podmnožinou ani překladem.

#emph[Stav leží mimo model a je zjistitelný.] Kritérium vyžaduje pojmenovat artefakt, úložiště, kde leží, a osobu, která do něj může nahlédnout, aniž by se musel ptát modelu. Stav uložený v konverzaci je také stav, ale jeho jediným čtenářem je model, který v něm pracuje.

#emph[Brány jsou výslovné a druhy jejich rozhodnutí se nerozplývají.] Kritérium vyžaduje, aby brána existovala, věděla, jaké rozhodnutí činí, a označila své rozhodnutí za druhové. Druhů jsou tři: deterministická kontrola, jejíž výsledek lze přepočítat nebo znovu spustit bez modelu; modelem hodnocená brána, která je dotazem na jiný model, a je proto stejně pravděpodobnostní jako to, co posuzuje; a lidská brána. Běh nesmí projít bránou jednoho druhu prostředky jiného: modelem hodnocená brána nenahrazí deterministickou kontrolu, protože neporovnává výsledek s tím, co se dá přepočítat, a lidská brána bránu předchozí nenahrazuje, nýbrž ji schvaluje. Toto rozdělení není vynalézeno zde; dokumentace, která popisuje vládnutí běhu, uvádí bránu, která „can run a script for deterministic checks or a prompt for model-evaluated ones“ @claude-goal, a druhou z nich odhazuje právě proto, že je pravděpodobnostní.

#emph[Člověk rozhoduje, co vstoupí do produkce.] Kritérium je formulováno jako nepodléhající vyjednávání: v popsaném systému musí existovat pojmenovaný okamžik, v němž rozhodne určený člověk o určené věci, a nesmí existovat žádná jiná cesta, která by ke stejnému bodu vedla. Podmínka „určený“ je ostrá: musí jít o osobu, kterou lze pojmenovat, nikoli o kohokoli, kdo v okamžiku klikne. Kritérium je jediné, které práce neváže na výsledek měření a neoslabuje, protože systém, který je nesplňuje, neprovádí podle ní inženýrskou práci, ale automatizovanou výrobu změn bez odpovědného člověka — a to je přesně ta věc, kterou konference v Garmischi odmítla bez důvodu @nato1969.

#heading(level: 3)[Otevřená otázka: složení vrstev] <slozeni>

Systém popsaný v této práci má nad sebou dvě vrstvy harnessu. Vnější je runner s branami a uloženým stavem, vnitřní je produkční CLI, které modelové kroky vykonává. Během jednoho běhu se tedy model setkává se dvěma sadami pravidel současně. Které z nich má převážit a co stojí vnější vrstva, na to teoretická část neodpovídá.

Část odpovědi je přesto veřejně dostupná a práce ji nechává stát, místo aby ji doplnila odhadem. Dokumentace, která popisuje vrstvení běhů, rozlišuje předání práce, při němž zůstává jediný cyklus, od volání agenta jako nástroje, při němž vzniká vnořený běh s vlastním cyklem, limitem iterací a žádostmi o schválení. Není tím řečeno ani to, kterému pravidlu se model podřizuje, ani jak vysoký je náklad: „the nested turns do not increment the outer run’s turn counter“ @openai-agents-sandbox, takže účetnictví vnější vrstvy práci vnořeného běhu nevidí. Zda je takový náklad v popsaném systému významný, zjištěno nebylo. Záznam opakovatelnosti výše na otázku neodpovídá, protože z něj nelze vyčíst, čím se spouštěná smyčka liší od jiné, a práce to nezaměňuje za odpověď na otázku o konvencích. Otázka zůstává otevřená a je evidována jako omezení, nikoli jako vyřešený bod.
