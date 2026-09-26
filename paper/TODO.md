# Otevřené body práce

Práce *Vzrůst Agentického AI: úvod do agentického inženýrství a implementace
software factory* (DarkFactory). Zbývající body, o kterých je známo, že nejsou
vyřešené. Nové položky přidat na konec příslušné sekce.

Stav zkontrolován po commitu `1c5099d2`, 28 stran, sazba bez varování.

**Celkem otevřeno: 11 položek** — z toho 4 vyžadují rozhodnutí vedoucího práce,
zbytek je práce pro autora nebo kontrolu rodným mluvčím.

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
| A5 | Metodika jako 3.1 místo samostatné kapitoly (kap. 2.4) | ⏳ **čeká na vedoucího** — viz B4 |
| A6 | Chyběla výzkumná otázka a hypotéza (kap. 2.3) | ✅ `34ad2ca1` |
| A7 | Závěr nehodnotil naplnění cíle a neměl doporučení (kap. 2.6) | ✅ `4b53cb88` |
| A8 | Omezení výzkumu v Diskusi (kap. 2.5) | ✅ `fbbfb7b6` |
| A9 | Anotace a abstrakt neodpovídaly rozsahu | ✅ `0147a69b` |

## B. Jazyková a stylistická korektura — částečně

| # | Co | Kde | Stav |
| :-- | :--- | :--- | :--- |
| B1 | **Nejvyšší priorita.** Procházet celý text s rodným mluvčím. Jazyková úroveň nese 15 ze 200 bodů (5 gramatická správnost, 10 stylistická). Žádný nástroj nerozezná kolokaci od chyby. | celá práce | ⏳ |
| B2 | Hlasová kontrola dvojic „podstatné jméno + rozvinutá příčka“, např. *přijetí a plánování požadavku*. | `pages/30`–`35` | ⏳ |
| B3 | **Rozhodnutí o hlasu.** `review smyčka` a další anglické technické výrazy jsou užity souvisle a odpovídají popiskům *uvnitř* obrázků. Změnit jen text bez změny diagramů by dokument zhoršilo. Buď ponechat, nebo přejít na české ekvivalenty a překreslit popisky v SVG. | celá práce + `components/img/*.svg` | ⏳ autor |
| B4 | Procházet teoretickou část s rodným mluvčím. Mechanický sken našel přes 100 nálezů, z nichž drtivá většina byly falešné poplachy (odsazení v Typstu, záměrné dvojice `claude claude` ve výpisu rozhraní), ale regex nerozezná kolokaci od chyby. | `pages/21`–`24` | ⏳ |
| B5 | Věta se třemi podřadicími členy bez interpunkce a s chybějící mezerou v `kdybyse`; relativní věta, která pohltila hlavní větu; `checkoutují` jako sloveso. | `pages/23-theory-agentic.typ` aj. | ✅ `1c5099d2` |
| B6 | Nadbytečná mezera na začátku odstavce (Typst ji vykreslí jako mezeru mezi slovy) a odkaz na obrázek stojící samostatně jako věta. | `pages/23-theory-agentic.typ`, `pages/22-theory-harness.typ` | ✅ `1c5099d2` |

Tvrzení o 28 % chatbotů a 0,36 % coding agentů ponecháno záměrně — je to
argument práce, ne chyba. Průvodce v kap. 3.9 žádá u statistik uvedení zdroje a
metody; tabulka je opatřena citací @gradually-ai-usage-2026 a popiskem, takže
podmínka je splněna.

## C. Rozsah praktické části — vyřešeno rozdělením na dvě práce

Práce je rozdělena na dvě: tato (4. ročník, školní) a navazující (maturita).
Tím se otázka C1 vyřešila sama: popis počáteční implementace není kompromis,
ale předmět zkoumání. Navazující práce má popsat konečnou architekturu `df`.

| # | Co | Stav |
| :-- | :--- | :--- |
| C1 | Kterou revizi praktická část popisuje | ✅ rozhodnuto: `d576ec8f`, vymezení v §1.1 a §3.5 |
| C2 | Pasáž o pozdější konsolidaci byla `draft[]` a odporovala novému vymezení | ✅ `af23eaeb` — nahrazena odkazem na rozsah |
| C3 | Zachycené výpisy `--help` (`agy`, `codex`, `gemini`, `kimi`, `grok`, `cursor-agent`, `opencode`) jako samostatný obrázek. Výpis 1 dnes obsahuje jen deklarované argv; plné `--help` by ukázalo rozdíl mezi tím, co pipeline tvrdí, a tím, co nástroje skutečně nabízejí. Zachyty leží v `/var/folders/…/opencode/help/`. | ⏳ nabídka, nepřijata |
| C4 | `components/bib/references.bib` obsahuje `darkfactory-e9c10221`, který už není citován a v seznamu zdrojů se proto neobjeví. ponechán záměrně — je předmětem navazující práce. | ✅ informativní |

## D. Repozitář

| # | Co | Stav |
| :-- | :--- | :--- |
| D1 | `paper/.opencode/goals/` nebyl v `.gitignore` a objevoval se v každém `git status` | ✅ `4a0e2e73` |
| D2 | Práce je na větvi `docs/thesis`, jejíž historie patří dokumentům. Rozhodnuto ponechat. Na větvi přibývá i cizí práce (`README.md`), s touto se nijak nepletou. | ✅ rozhodnuto |
| D3 | `styles/draft.typ` není v dokumentu použit. Ponechán záměrně pro navazující práci; viz jeho hlavičku. | ✅ informativní |

## E. Vyžaduje rozhodnutí vedoucího práce

| # | Co | Proč |
| :-- | :--- | :--- |
| E1 | **Způsob citací.** Průvodce připouští harvardský i číselný a volbu přenechává vedoucímu (kap. 5). Práce používá číselné, tedy ISO 690 numeric. Potvrdit. | `rules.md` §5 |
| E2 | **Umístění metodiky.** Průvodce kap. 2.4 předpokládá metodickou část jako samostatnou kapitolu; zde je podkapitolou 3.1. Přesun je mechanický, `pages/31-practical-method.typ` je už oddělený. | viz A5 |
| E3 | **Zadaný rozsah práce.** Hodnoticí protokol dává 10 bodů za „splnění zadaného rozsahu práce". Je k dispozici písemné zadání od vedoucího? Pokud ano, je nutné práci proti němu explicitně prověřit — dodnes se to dělalo pouze proti průvodci. | nově zjištěno |
| E4 | **CSL šablona** `gjkt-iso690-numeric-cs.csl` — je aktuální? Bez ní by číselné citace nemusely vyhovovat požadované školní podobě. | `rules.md` §5 |

## F. Kontrola před odevzdáním

| # | Co | Proč |
| :-- | :--- | :--- |
| F1 | Nechat zkontrolovat cizím okem celou práci, nejen jazykově. | Několikrát se ukázalo, že kontrola odhalí věci, které vlastní oko přestalo vidět. |
| F2 | Znovu srovnat výpisy proti nainstalovaným nástrojům, zejména `claude` (viz G1). Každá revize CLI může změnit přepínač. | `pages/32-practical-architecture.typ` |
| F3 | Požádat vedoucího o zpětnou vazbu k novému názvu, výzkumné otázce a oddělení dvou prací. Změna názvu a přesunutí praktické části jsou věcné krok. | práce jako celek |

## G. Předání

| # | Co | Proč |
| :-- | :--- | :--- |
| G1 | `claude` CLI nebylo na stroji nainstalováno, jeho rozhraní vychází z oficiální dokumentace Anthropic a v práci je to tak i označeno `(dokumentace, nezachyceno)`. Při předání doplnit vlastní záchyt — nebo položku ponechat takto, protože označení je poctivé. | `Výpis 1`, jediná neověřená prvním zachycením |
| G2 | Zachyty `--help` leží v dočasném adresáři a nejsou součástí repozitáře. Pokud C3 přijme, musí se uložit do `components/img/` nebo jinam trvale. | viz C3 |
