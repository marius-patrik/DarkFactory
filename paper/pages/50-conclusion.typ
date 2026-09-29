// Chapter 4.3, the closing summary.
//
// Every paragraph here confirms or generalises; none of them re-describes the
// pipeline, re-lists the three criteria, or re-states the model-versus-system
// claim. Each of those is owned elsewhere in the document and is referred to
// symbolically or not at all, so the reader meets each idea once. The file is
// the target of the say-once pass recorded in ../PLAN.md, phase 5.
#heading(level: 2)[Shrnutí]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků. Na výzkumnou otázku, které principy musí agentický systém splnit, aby vykonával inženýrskou práci, odpovídá tato práce třemi principy: stav mimo model a zjistitelný, brány s druhy rozhodnutí, které se nerozplývají, a rozhodnutí člověka o tom, co vstoupí do produkce. Podmíněná nutnost znamená, že nutné je to, dokud model sám danou práci spolehlivě nevykoná; s rostoucí schopností modelů se tato hranice posouvá, ale ne mizí.

Implementace pipeline DarkFactory ukázala jednoduchou produkční realizaci těchto postupů. GitHub slouží jako vývojové prostředí a místo trvalého stavu, GitHub Actions jako výpočetní prostředí, Dockerový kontejner jako izolace a produkční harness pro modelovou práci s nástroji. Požadavek prochází interpretací a plánováním, implementace probíhá na samostatné větvi a změna je předána přes draft pull request a opakovací smyčku review--fix. Po čisté review a kontrole souladu s plánem následuje lidské schválení, merge a odstranění větve.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního provádění kódu k formulaci zadání, schvalování plánu, definování akceptačních podmínek a rozhodování, zda je výsledek připraven k integraci. Práce tedy nepopisuje plnou autonomii agenta, ale kontrolované předání vybrané části softwarového inženýrství.

Zjištění zároveň ukazují meze této realizace. Modelové review může být opakované, ale není deterministickou zárukou správnosti. Review smyčka se po vyčerpání tří iterací zastaví bez zaznamenaného verdiktu, takže průchod od zastavení rozlišit není; zablokovaný stav zde znamená vyčerpanou kvótu, nikoli opakovaný nález; a opakovatelná kontrola před sloučením běží, ale změně s neprocházejícími testy zabrání jen tehdy, když ji zopakuje, což popsaná revize nečiní.

Cíle práce se podařilo naplnit v rozsahu, který si sama vymezila. Hypotéza se potvrdila: praktická autonomie je vlastností návrhu systému, který práci řídí, a nikoli vlastností modelu, který v něm pracuje. Strukturu, která práce popisuje, autor navrhuje sám; úsudek o tom, co je v jednotlivém kroku správné, však přebírá od smyčky, kterou nevlastní, a právě v tomto rozdílu leží hranice, za kterou by pomohlo vlastnit i tuto smyčku.

Pro další výzkum z toho vyplývají tři směry. První je vlastní harness: popsat architekturu, kterou si tato práce záměrně neřešila, a porovnat její výsledky s výsledky cizích nástrojů na stejných úlohách. Druhý je měření: dosavadní zjištění jsou kvalitativní, chybí jim to, co by umožnilo říct, o kolik se cyklus zkrátil a kde přesně review smyčka nachází nejvíce nálezů, a prvním krokem je nechat rozlišit čistou recenzi od zastavené smyčky a nechat opakovanou kontrolu běžet znovu, protože dnes hlásí, ale nebrání. Třetí je otázka, která zůstala v diskusi otevřená: když vnější vrstva je sama o sobě harnessem, setkává se model během jednoho běhu se dvěma soubory konvencí, a práce neprovedla měření, které by ukázalo, kterých následuje a co vnější vrstva stojí.

V praxi má práce přímý dopad v podobě jednoduchého pravidla: delegovat agentovi až to, co lze zkontrolovat, a ponechat mu vlastní smyčku jen tam, kde je výhodná. Kdo takovou pipeline staví, nemusí začínat vlastním harnessem; začíná stavem uloženým mimo model, dvěma branami před vznikem větve a oddělenou kontrolou výstupu. A ještě jedno, které z popsaného systému vyplynulo a které je stejně důležité jako tyto tři: je-li brána, která má být lidská, v jedné konfiguraci schopna vyplnit stroj, pak její jméno neznamená nic, pokud u ní není zapsáno, kdo ji vykonává.
