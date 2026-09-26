# Otevřené body práce

Práce *AI asistované softwarové inženýrství* (DarkFactory). Zbývající body,
o kterých je známo, že nejsou vyřešené. Nové položky přidat na konec příslušné
sekce.

Stav zkontrolován po commitu `2422e0e7`.

---

## A. Školní pravidla — vyřešeno

Kontrola proti `rules.md` proběhla dvakrát: poprvé na sazbu a součásti textu,
podruhé na strukturu podle kapitoly 2 a 7. Všechny nedostatky jsou opravené,
každý vlastním commitem.

| # | Co | Stav |
| :-- | :--- | :--- |
| A1 | Odkazy v textě u čtyř součástí | ✅ `1051e437` |
| A2 | `Výpis 1` chyběl v seznamu součástí | ✅ `487e0b06` |
| A3 | Anotace 128 slov | ✅ `89109fc7` |
| A4 | Šest klíčových slov | ✅ `1d0d4fe9` |
| A5 | Metodika jako 3.1 místo samostatné kapitoly (kap. 2.4) | ⏳ **čeká na vedoucího** — přesun je mechanický |
| A6 | Chyběla výzkumná otázka a hypotéza (kap. 2.3) | ✅ `34ad2ca1` |
| A7 | Závěr nehodnotil naplnění cíle a neměl doporučení (kap. 2.6) | ✅ `4b53cb88` |
| A8 | Omezení výzkumu v Diskusi (kap. 2.5) | ✅ `fbbfb7b6` |
| A9 | Anotace a abstrakt neodpovídaly rozsahu | ✅ `0147a69b` |

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
