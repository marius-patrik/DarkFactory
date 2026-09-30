// 3.3 System architecture.
#heading(level: 2)[Architektura systému] <darkfactory-architecture>

Návrhové principy z předchozí části jsou v praktické implementaci rozděleny mezi GitHub, GitHub Actions,
izolované pracovní prostředí a produkční coding-agent harness. GitHub uchovává vývojový stav a události,
Actions spouštějí jednotlivé fáze, Docker odděluje agentní běh a pythonovský runner převádí stav workflow
na konkrétní agentní krok. Samotnou agentní smyčku, práci s modelem a nástroji zajišťuje zvolený harness
@darkfactory-d576ec8f. Toto rozdělení znázorňuje @fig-darkfactory-architecture.

#figure(
  image("/components/img/darkfactory-architecture.svg", width: 100%),
  caption: [Architektura DarkFactory: GitHub poskytuje události a trvalý vývojový stav, GitHub Actions
  výpočetní prostředí, Docker izolaci běhu a pythonovský runner převádí událost na agentní krok.
  Produkční harness zajišťuje model, nástroje a agentní smyčku @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

GitHub v tomto uspořádání neplní pouze roli vzdáleného repozitáře. Issue uchovává uživatelský požadavek,
interpretaci a navazující diskusi, pracovní větev a commity nesou samotnou implementaci a pull request
slouží jako místo automatické i lidské revize. Stav tak není závislý na jednom kontextovém okně modelu
a jednotlivé agentní běhy mohou na předchozí práci navazovat přes objekty, které jsou součástí běžného
vývojového workflow @darkfactory-d576ec8f.

Události nad těmito objekty spouštějí GitHub Actions. Workflow `agent.yml` reaguje na otevření issue,
nový komentář, review komentář, `repository_dispatch` nebo ruční spuštění. V každém běhu se připraví
cílový repozitář, sestaví se agentní obraz podle `docker/Dockerfile.agent` a runner je spuštěn uvnitř
kontejneru nad checkoutnutým pracovním stromem. DarkFactory tím používá GitHub Actions současně jako
událostní mechanismus i jako krátkodobé výpočetní prostředí, aniž by základní pipeline vyžadovala vlastní
trvale běžící službu @darkfactory-d576ec8f.

Pythonovský `agent_runner.py` je orchestrace nad harnesssem, nikoli jeho náhrada. Rozlišuje jednotlivé
fáze, například interpretaci, plánování, implementaci, automatickou revizi, kontrolu souladu s plánem
a reakci na zpětnou vazbu. Současně zpracovává stav procesu a výstupy jednotlivých kroků. Vlastní práce
coding agenta je oddělena za registry v `harnesses.py`: každý podporovaný harness deklaruje binární
soubor, způsob sestavení příkazové řádky, autentizaci a modelové fallbacky. Pořadí harnessů lze měnit
konfigurací, takže orchestrace nemusí znát konkrétní CLI, které modelový krok právě provádí
@darkfactory-d576ec8f.

Odděleně jsou řešeny také přihlašovací údaje. Operace nad GitHubem používají autorizovaný token nebo GitHub
App, zatímco přihlašovací údaje poskytovatelů modelů vstupují do workflow jako GitHub Secrets a jsou
předány pouze běhu, který je potřebuje. Nejsou součástí issue, commitů ani jiného trvalého záznamu práce
@darkfactory-d576ec8f.

Součástí architektury je i dokumentační vrstva. Ve zkoumané revizi pravidla vyžadují dokumentaci veřejného
API přímo ve zdrojových souborech a dokumentační web se generuje z těchto inline popisů a z kanonických
repozitářových dokumentů. Publikovaná dokumentace tak není samostatnou ručně udržovanou kopií systému,
ale čitelným pohledem nad jeho zdroji. Pro člověka představuje most mezi automatizovaným procesem a
konkrétním kódem, ze kterého tento proces vzniká @darkfactory-d576ec8f.

Samotný seznam komponent ještě nevysvětluje, jak spolupracují při skutečném vývojovém požadavku.
Následující část proto sleduje celý průchod od zadání až po integraci výsledku.
