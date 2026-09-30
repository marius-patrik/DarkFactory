#import "../components/terms.typ": term-name

#heading(level: 2)[Návrh systému DarkFactory] <darkfactory-design>

DarkFactory byla navržena jako záměrně malá realizace principů popsaných v teoretické části. Cílem první verze nebylo pokrýt co nejvíce funkcí, ale uzavřít nejmenší prakticky použitelný vývojový cyklus. Systém přijme požadavek, předá otevřenou inženýrskou práci agentovi, zachová průběžný stav a vrátí výsledek do běžného procesu na GitHubu. Rozsah byl zvolen tak, aby bylo možné první funkční podobu vytvořit v jednom souvislém agentním běhu a další změny už provádět stejným procesem.

GitHub slouží nejen jako hosting repozitáře, ale také jako hlavní rozhraní a trvalá stavová vrstva systému. Požadavek, diskuse, schválení, větev, commity a #term-name("Pull Request", cs: "požadavek na sloučení") proto zůstávají mimo kontext modelu a přežívají jednotlivé agentní běhy. Události GitHubu spouštějí příslušné pracovní postupy GitHub Actions, takže DarkFactory pro základní průchod nepotřebuje vlastní trvale běžící server. Každý agentní krok probíhá odděleně a pracovní prostředí je izolováno kontejnerem @darkfactory-d576ec8f.

DarkFactory neimplementuje vlastní agentní runtime. Produkční #term-name("Harness", cs: "agentní harness") zajišťuje agentní smyčku, komunikaci s modelem, nástroje a práci s kontextem. DarkFactory nad tím řídí pořadí kroků, stav procesu a lidské brány. Otevřené úlohy řeší model prostřednictvím harnessu, zatímco přesně určitelné kroky, například práce s větví, testy, formátování nebo změna stavu, zůstávají programově řízené @darkfactory-d576ec8f.

Dokumentace tvoří rozhraní mezi automatizovaným procesem a člověkem. Ve zkoumané revizi vzniká dokumentace veřejných rozhraní přímo u zdrojového kódu a dokumentační web se generuje z kanonických souborů repozitáře. Publikovaná dokumentace tak není druhou ručně udržovanou kopií systému, ale čitelným pohledem nad stejnými zdroji, se kterými pracují agenti a automatizace @darkfactory-d576ec8f.

Člověk nemusí řídit jednotlivé technické kroky, ale schvaluje záměr a plán před implementací a na konci rozhoduje o přijetí výsledku. Mezi těmito body proces pokračuje automaticky. První verze tak současně tvoří počáteční základ pro další vývoj DarkFactory. Jakmile základní cyklus funguje, může být stejný proces použit i pro další rozšiřování vlastního systému.
