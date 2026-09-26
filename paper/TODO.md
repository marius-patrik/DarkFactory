# Otevřené body práce

Práce *AI asistované softwarové inženýrství* (DarkFactory). Zbývající body,
o kterých je známo, že nejsou vyřešené. Nové položky přidat na konec příslušné
sekce.

Stav zkontrolován po commitu `2422e0e7`.

---

## A. Školní pravidla — nedoplněno

Podrobnosti a citace v `rules.md`. Počítáno do hodnocení (viz `guide.md`,
*Hodnocení*).

| # | Co | Kde | Váha |
| :-- | :--- | :--- | :--- |
| A1 | Čtyři očíslované součásti nemají odkaz v textě: `fig-gradually-usage`, `fig-react-loop`, `fig-darkfactory-architecture`, `fig-darkfactory-pipeline` | `rules.md` R1 | 5 b (odkazování) |
| A2 | Seznam součástí textu není kompletní — neobsahuje `Výpis 1` | `rules.md` R2 | 1 b |
| A3 | Anotace má 128 slov, doporučeno 150–250 | `rules.md` R3 | 2 b |
| A4 | Šest klíčových slov, průvodce uvádí přibližně pět | `rules.md` R4 | 1 b |
| A5 | Metodika je podkapitolou 3.1, průvodce (kap. 2.4) ji předpokládá jako samostatnou kapitolu. Potvrdit s vedoucím; přesun je mechanický, soubor `pages/31-practical-method.typ` je už oddělený | `pages/31-practical-method.typ` | 1 b (členění) |

## B. Jazyková a stylistická korektura — neprovedeno

| # | Co | Kde |
| :-- | :--- | :--- |
| B1 | Procházet teoretickou část s rodným mluvčím. Mechanický sken našel přes 100 nálezů, z nichž drtivá většina byly falešné poplachy (odsazení v Typstu, záměrné dvojice `claude claude` ve výpisu rozhraní), ale regex nerozezná kolokaci od chyby. Opraveno vše, co šlo zachytit mechanicky; zbytek je třeba přečíst. | `pages/2*.typ` |
| B2 | Dvojice „podstatné jméno + rozvinutá příčka“ na několika místech stojí za hlasovou kontrolou | celá práce |

Tvrzení o 28 % chatbotů a 0,36 % coding agentů ponecháno záměrně — je to
argument práce, ne chyba. Pouze připomínáme, že průvodce v kap. 3.9 žádá u
statistik uvedení zdroje a metody; tabulka v práci je opatřena
citací @gradually-ai-usage-2026 a popiskem, takže podmínka je splněna.

## C. Rozhodnutí o rozsahu praktické části — neuzavřeno

| # | Otázka | Kde |
| :-- | :--- | :--- |
| C1 | Praktická část popisuje stav revize `d576ec8f`, tedy pipeline volající produkční harnessy. Pozdější revize `e9c10221` agenty zahodila a svedla vše do vlastního harnessu `df`. Popisovaný stav tedy **v době odevzdání neexistuje**. Tři možnosti: ponechat popsaný stav a explicitně omezit tvrzení (současný stav, se závěrem v 4.2.1), přepnout předmět na vlastní harness, nebo prezentovat evoluci jako výsledek. | `pages/41-discussion.typ`, `pages/35-practical-integration.typ` |
| C2 | Pasáž o pozdější konsolidaci na `df` je označena `draft[]` a podle rozhodnutí autorek pravděpodobně do finální verze nevstoupí. Pokud zůstane, je třeba ji znovu posoudit — viz C1. | `pages/35-practical-integration.typ` |
| C3 | Nabídka: zachycené výpisy `--help` (`agy`, `codex`, `gemini`, `kimi`, `grok`, `cursor-agent`, `opencode`) jako samostatný obrázek s popisky. Výpis 1 dnes obsahuje jen deklarované argv; plné `--help` by ukázalo rozdíl mezi tím, co pipeline tvrdí, a tím, co nástroje skutečně nabízejí. | `pages/32-practical-architecture.typ` |

## D. Repozitář

| # | Co | Kde |
| :-- | :--- | :--- |
| D1 | `paper/.opencode/goals/` není v `.gitignore` — 8 souborů se stavem agenta. Nebyl commitnut, ale objeví se v každém `git status`. | `.gitignore` |
| D2 | Práce je na větvi `docs/thesis`, jejíž historie patří dokumentům, ne práci. Rozhodnuto ponechat. | — |

## E. Zdroje k dohledání při předání

| # | Co | Proč |
| :-- | :--- | :--- |
| E1 | `claude` CLI nebylo na stroji nainstalováno, jeho rozhraní vychází z oficiální dokumentace Anthropic a v práci je to tak i označeno. Při předání doplnit vlastní záchyt. | `Výpis 1` — jediná položka neověřená prvním zachycením |
| E2 | Ověřit, zda CSL šablona `gjkt-iso690-numeric-cs.csl` je aktuální a zda vedoucí práce potvrzuje číselné citace jako zvolenou metodu. | `rules.md` §5 |
