// Chapter 5, Conclusion.
#heading(level: 1)[Závěr]

Jazykový model sám o sobě pouze generuje výstup v závislosti na vstupním kontextu. Agent z něj vzniká až propojením s nástroji, prostředím, stavem a pozorováním, které zajišťuje harness @anthropic2024tooluse @anthropic-harness-design. Ani toto propojení však pro účinné nasazení ve vývoji softwaru nestačí bez postupů Agentického inženýrství, které vymezují rozsah autonomie, určují body lidského rozhodnutí a zajišťují ověřování výsledků.

Implementace pipeline DarkFactory ukázala jednoduchou produkční realizaci těchto postupů. GitHub slouží jako vývojové prostředí a místo trvalého stavu, GitHub Actions jako výpočetní prostředí, Docker kontejner jako izolace a produkční harness pro modelovou práci s nástroji. Požadavek prochází interpretací a plánováním, implementace probíhá na samostatné větvi a změna je předána přes draft pull request a opakovací smyčku review--fix. Po čisté review následuje lidské schválení, merge a odstranění větve.

Úloha vývojáře se v tomto uspořádání posouvá od rutinního provádění kódu k formulaci zadání, schvalování plánu, definování akceptačních podmínek a rozhodování, zda je výsledek připraven k integraci. Práce tedy nepopisuje plnou autonomii agenta, ale kontrolované předání vybrané části softwarového inženýrství.

Zjištění zároveň ukazují meze této realizace. Modelové review může být opakované, ale není deterministickou zárukou správnosti; opakovaný nález bez progresu vede k blokaci.

Cíle práce se podařilo naplnit v rozsahu, který si sama vymezila. Hypotéza byla potvrzena, ovšem v užší podobě, než byla formulována: řízená autonomie je dosažitelná i bez vlastního harnessu, ale její kvalita zůstává omezena kvalitou cizí smyčky, kterou autor neovládá. Současně se potvrdilo, že popsaná struktura procesu je vůči volbě nástroje invariantní, což je tvrzení, z něhož lze prokazatelně vycházet.

Pro další výzkum z toho vyplývají tři směry. První je vlastní harness: popsat architekturu, kterou si tato práce záměrně neřešila, a porovnat její výsledky s výsledky cizích nástrojů na stejných úlohách. Druhý je měření: dosavadní zjištění jsou kvalitativní, chybí jim měření, která by umožnila říci, o kolik se cyklus zkrátil a kde přesně review smyčka nachází nejvíce nálezů. Třetí je přenositelnost: ověřit, zda popsaná struktura platí i pro jiný stavový podklad než issue, což by ukázalo, že je opravdu zásadní, a ne pouze vlastností GitHubu.

V praxi má práce přímý dopad v podobě jednoduchého pravidla: delegovat agentovi až to, co lze zkontrolovat, a ponechat mu vlastní smyčku jen tam, kde je výhodná. Kdo takovou pipeline staví, nemusí začínat vlastním harnessem; začíná stavem uloženým mimo model, dvěma branami před vznikem větve a oddělenou kontrolou výstupu.
