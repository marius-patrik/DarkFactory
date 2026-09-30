// 3.2 Architecture of a production run.
#heading(level: 2)[Architektura produkčního běhu] <architektura>

Pro základní průchod nepotřebuje DarkFactory nic, co by muselo běžet trvale na vlastním počítači. Všechno, co
pipeline potřebuje, už existuje: GitHub slouží jako rozhraní i jako trvalý stavový systém a každá práce agenta
probíhá jako izolovaný běh v GitHub Actions. Členění do vrstev znázorňuje @fig-darkfactory-architecture a
pořadí jednotlivých kroků @fig-darkfactory-pipeline.

#figure(
  image("/components/img/darkfactory-architecture.svg", width: 100%),
  caption: [Architektura: GitHub poskytuje události a vývojový stav, GitHub Actions výpočet, Docker odděluje běh a
  pythonovský runner převádí událost na agentní krok. Produkční harnessy zajišťují model, nástroje a pozorování
  @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

#figure(
  image("/components/img/darkfactory-pipeline.svg", width: 100%),
  caption: [Průchod požadavku: implementace a plánování jsou odděleny lidskými bránami, implementace probíhá na
  větvi a review smyčka se opakuje, dokud nález nezmizí. Smyčka může skončit i bez verdiktu; zablokuje ji jen
  vyčerpaná kvóta @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Workflow `agent.yml` reaguje na otevření issue, nový komentář, review komentář, `repository_dispatch` nebo ruční
spuštění. Podmínka na úrovni jobu ověří, zda je agent pro repozitář povolen, a odfiltruje automatické
komentáře, aby jeho výstup nevytvářel další události. Workflow provede checkout cílového repozitáře, sestaví obraz
podle `docker/Dockerfile.agent` a spustí příkaz `dispatch` v kontejneru.

Pythonovský runner není náhradou harnessu. Převádí událost GitHubu na konkrétní agentní krok, zpracovává jeho
výstup a vyvolává další událost. Modelové kroky stále provádí harness nad explicitně předaným pracovním stromem
@darkfactory-d576ec8f.

Každý harness je definován deklarativně: binár, způsob, jak se z promptu sestaví příkazová řádka, a způsob
přihlášení. Přidání harnessu je tedy změna dat, nikoli kódu @darkfactory-d576ec8f. V registru je osm harnessů
v konfigurovatelném pořadí.

Přihlašovací údaje se neukládají do repozitáře. GitHub App nebo jiný autorizovaný token se používá pro checkout,
issue, pull requesty a push; přihlašovací údaje modelových providerů jsou předány workflow jako GitHub Secrets a
následně do kontejneru @darkfactory-d576ec8f.
