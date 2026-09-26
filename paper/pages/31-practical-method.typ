// 3.1 Method.
#heading(level: 2)[Metodika] <practical-first>

Praktická část implementuje záměrně jednoduchou produkční pipeline, v níž je vývojovým prostředím přímo GitHub a harness produkční coding agent. Cílem je ukázat, jak lze spojit události GitHubu, automatizované plánování, izolovanou práci v kontejneru a lidskou integraci do jednoho opakovatelného procesu.

Předmětem analýzy jsou čtyři navazující vrstvy:
1. *GitHub jako zdroj pravdy:* issue a jeho komentáře uchovávají požadavek, schválení, plán a zpětnou vazbu; větev, commit a pull request uchovávají změnu a její průběžnou revizi @github-branches @github-pull-requests.
2. *GitHub Actions jako výpočetní prostředí:* jednotlivé události spouštějí krátké workflow, které provede checkout pracovní kopie repozitáře, sestaví obraz, spustí agenta a následnou integraci provede.
3. *Python a Docker jako izolační vrstva:* workflow předá událost a pracovní strom pythonovskému runneru v kontejneru; runner volá harness a předává mu nástroje, přihlašovací údaje a stav úlohy.
4. *Review smyčka jako podmínka integrace:* automatická revize diffu, opravy a další revize se opakují do té doby, než se uzavře poslední nález; teprve poté je pull request předán člověku.

Metodika sama se řídí tvrzením práce. Pythonovský runner, o kterém tato část pojednává, byl napsán co nejjednodušeji pomocí produkčních coding agentů, tedy právě těm nástroji, které následně popisuje. Cílem nebyla stavba co nejucelenějšího systému, ale co nejmenší uzavřená smyčka, na níž lze ukázat, jak se navzájem ovlivňují agent, harness a lidský recenzent. Pozornost je proto soustředěna na tuto interakci a na její členění, nikoli na šíři nabízených funkcí.

Zjednodušení je záměrné a má svou cenu. Systém bez vlastního stavového serveru, bez databáze a bez trvalého běžícího procesu je na první pohled méně schopný než plnohodnotná platforma, oproti níž je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí zůstává vidět v issue, commitu nebo průběhu kontroly. Zároveň umožňuje zvyšovat složitost postupně: každý nový prvek pipeline byl přidán až poté, co bylo na konkrétní úloze zřejmé, že současná podoba nestačí. Samotná pipeline se tak stala nástrojem, kterým byla psána i další její část.
