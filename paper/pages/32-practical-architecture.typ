// 3.2 Architecture of a production run.
#heading(level: 2)[Architektura produkčního běhu] <architektura>

Pro základní průchod nepotřebuje DarkFactory nic, co by muselo běžet trvale na vlastním počítači. Všechno, co pipeline potřebuje, už existuje: GitHub slouží jako rozhraní i jako trvalý stavový systém a každá práce agenta probíhá jako izolovaný běh v GitHub Actions. Členění do čtyř vrstev znázorňuje @fig-darkfactory-architecture a pořadí jednotlivých kroků @fig-darkfactory-pipeline.

#figure(
  image("/components/img/darkfactory-architecture.svg", width: 100%),
  caption: [Architektura: GitHub poskytuje události a vývojový stav, GitHub Actions výpočet, Docker odděluje běh a pythonovský runner převádí událost na agentní krok. Produkční harnessy zajišťují model, nástroje a pozorování; registr jich má osm, obrázek ukazuje čtyři @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

#figure(
  image("/components/img/darkfactory-pipeline.svg", width: 100%),
  caption: [Průchod požadavku: implementace a plánování jsou odděleny lidskými bránami, implementace probíhá na větvi a review smyčka se opakuje, dokud nález nezmizí, v této revizi nejvýše třikrát @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Workflow `agent.yml` reaguje na otevření issue, nový komentář, review komentář, `repository_dispatch` nebo ruční spuštění. Podmínka na úrovni jobu ověřuje, zda je agent pro repozitář povolen, a filtruje automatické komentáře, aby vlastní výstup pipeline nevytvářel nové události. Workflow pak provede checkout cílového repozitáře, sestaví obraz podle `docker/Dockerfile.agent` a spustí příkaz `dispatch` v kontejneru. Obraz je sestaven z jedné definice, takže každý spotřebitel běží stejný runner, zatímco repozitář, na němž se pracuje, zůstává checkoutem volajícího.

Pythonovský runner není náhradou harnessu. Je rozhodovací a integrační vrstvou, která převádí událost GitHubu na konkrétní agentní krok, zpracovává jeho výstup a vyvolává další událost. Modelové kroky jsou přitom stále prováděny harnessem nad explicitně předaným pracovním stromem @darkfactory-d576ec8f.

Každý harness je tak definován deklarativně: binár, způsob, jak se z promptu sestaví příkazová řádka, a způsob přihlášení. Přidání harnessu je tedy změna dat, nikoli kódu @darkfactory-d576ec8f. V popsané revizi je v registru osm harnessů a pořadí, v němž se zkoušejí, je konfigurovatelné; harness, jehož binár v obrazu chybí, se přeskočí, takže jediný obraz unese jen podmnožinu nástrojů, která je v něm nainstalována. Tvrzení, že struktura procesu nezávisí na volbě nástroje, je proto v této revizi doslova pravdivé: strukturu popisuje registr, ne kód.

Přihlašovací údaje se neukládají do repozitáře. GitHub App nebo jiný autorizovaný token se používá pro checkout, issue, pull requesty a push; přihlašovací údaje modelových providerů jsou předány workflow jako GitHub Secrets a následně prostředím kontejneru. Tím pipeline odděluje své automatizační oprávnění od přihlašovacího materiálu agenta a umožňuje změnit poskytovatele bez změny pracovního stromu @darkfactory-d576ec8f.
