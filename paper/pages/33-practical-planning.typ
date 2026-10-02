#heading(level: 2)[Architektura systému] <darkfactory-architecture>

Pipeline je tvořena GitHub Actions workflow a pythonovskými skripty, které řídí jednotlivé fáze a předávají práci produkčnímu harnessu. Architektura tak rozděluje odpovědnost mezi GitHub, GitHub Actions, izolované pracovní prostředí a harness. GitHub uchovává stav, Actions spouštějí jednotlivé fáze, Docker odděluje agentní běh a řídicí skript převádí stav procesu na konkrétní agentní krok. Samotnou agentní smyčku, model a nástroje zajišťuje zvolený harness @darkfactory-d576ec8f. Přehled ukazuje @fig-darkfactory-architecture.

#figure(
  image("/components/img/darkfactory-architecture.svg", width: 100%),
  caption: [Architektura DarkFactory @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

GitHub uchovává uživatelský požadavek, interpretaci a diskusi. Pracovní větev a commity nesou implementaci a požadavek na sloučení slouží k automatické i lidské revizi. Stav proto není závislý na jednom kontextovém okně modelu @darkfactory-d576ec8f.

GitHub Actions reagují na otevření požadavku, nový komentář, komentář k revizi, interní událost nebo ruční spuštění. Každý běh připraví repozitář a spustí agenta v kontejneru. DarkFactory tak používá Actions jako událostní mechanismus i krátkodobé výpočetní prostředí bez vlastní trvale běžící služby @darkfactory-d576ec8f.

Soubor `agent_runner.py` řídí fáze interpretace, plánování, implementace, automatické revize, kontroly souladu s plánem a reakce na zpětnou vazbu. Vlastní agentní práce je oddělena pomocí registru v `harnesses.py`, který popisuje podporované harnessy, jejich příkazové rozhraní, autentizaci a záložní modely @darkfactory-d576ec8f.

Přihlašovací údaje jsou od trvalého stavu oddělené. Operace nad GitHubem používají autorizovaný token nebo GitHub App, zatímco přihlašovací údaje poskytovatelů modelů vstupují pouze do běhu, který je potřebuje @darkfactory-d576ec8f.
