// 3.2 Architecture of a production run.
#heading(level: 2)[Architektura produkčního běhu] <architektura>

Pro základní průchod nepotřebuje DarkFactory nic, co by muselo běžet trvale na vlastním počítači. Všechno, co pipeline potřebuje, už existuje: GitHub slouží jako rozhraní i jako trvalý stavový systém a každá práce agenta probíhá jako izolovaný běh v GitHub Actions. Členění do čtyř vrstev znázorňuje @fig-darkfactory-architecture a pořadí jednotlivých kroků @fig-darkfactory-pipeline.

#figure(
  image("/components/img/darkfactory-architecture.svg", width: 92%),
  caption: [Architektura: GitHub poskytuje události a vývojový stav, GitHub Actions výpočet, Docker odděluje běh a pythonovský runner převádí událost na agentní krok. Produkční harnessy `claude`, `codex`, `opencode` a `agy` zajišťují model, nástroje a pozorování @darkfactory-d576ec8f.],
) <fig-darkfactory-architecture>

#figure(
  image("/components/img/darkfactory-pipeline.svg", width: 92%),
  caption: [Průchod požadavku: implementace a plánování jsou odděleny lidskými bránami, implementace probíhá na větvi a review smyčka pokračuje do vyřešení nálezů @darkfactory-d576ec8f.],
) <fig-darkfactory-pipeline>

Workflow `agent.yml` reaguje na otevření issue, nový komentář, review komentář, `repository_dispatch` nebo ruční spuštění. Podmínka na úrovni jobu ověřuje, zda je agent pro repozitář povolen, a filtruje automatické komentáře, aby vlastní výstup pipeline nevytvářel nové události. Po volbě cílového repozitáře workflow provede checkout jeho pracovní kopie, sestaví obraz podle `docker/Dockerfile.agent` a spustí příkaz `dispatch` v kontejneru.

Pythonový runner není náhradou harnessu. Je rozhodovací a integrační vrstvou, která převádí událost GitHubu na konkrétní agentní krok, zpracovává jeho výstup a vyvolává další událost. Modelové kroky jsou přitom stále prováděny harnessem nad explicitně předaným pracovním stromem @darkfactory-d576ec8f.

Každý harness je tak definován deklarativně: binář, způsob, jak se z promptu sestaví příkazová řádka, a způsob přihlášení. Přidání harnessu je tak změna dat, nikoli kódu. @fig-harness-interfaces uvádí rozhraní skutečně používaná v popisované revizi; `<prompt>` je zadání, `<model>` vybraný model a `<dur>` časový limit.

// The invocation each harness is declared with, together with the version of the tool
// against which the declaration was checked. All eight were captured first-hand on
// 2026-09-27 by running `--help` on the installed CLI, not read from documentation.
#let harness-interfaces = (
  "antigravity   agy 1.2.10",
  "  --print <prompt> --model <model> --dangerously-skip-permissions --print-timeout <dur>",
  "claude        claude 2.1.283",
  "  --print <prompt> --model <model> --output-format text --dangerously-skip-permissions",
  "gemini        gemini 0.55.1",
  "  -p <prompt> --model <model> --yolo",
  "codex         codex-cli 0.155.1",
  "  exec <prompt> --model <model> --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check",
  "kimi          kimi 0.42.0",
  "  --prompt <prompt> --model <model> --output-format text --yolo",
  "grok          grok 1.0.30",
  "  --single <prompt> --model <model> --always-approve",
  "cursor        cursor-agent 2026.08.11",
  "  --print <prompt> --model <model> --force",
  "opencode      opencode 1.18.32",
  "  run <prompt> --model <model> --auto",
)

#figure(
  raw(block: true, harness-interfaces.join("\n")),
  caption: [Rozhraní produkčních harnessů: název v registru, binář a ověřená verze, poté příkazová řádka, kterou z bináře runner sestavuje. Deklarace odpovídá revizi @darkfactory-d576ec8f.],
) <fig-harness-interfaces>

Přihlašovací údaje se neukládají do repozitáře. GitHub App nebo jiný autorizovaný token se používá pro checkout, issue, pull requesty a push; přihlašovací údaje modelových providerů jsou předány workflow jako GitHub Secrets a následně prostředím kontejneru. Tím pipeline odděluje své automatizační oprávnění od přihlašovacího materiálu agenta a umožňuje změnit poskytovatele bez změny pracovního stromu @darkfactory-d576ec8f.
