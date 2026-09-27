# Otevřené body práce

Práce *Vzrůst Agentického AI: úvod do agentického inženýrství a implementace
software factory* (DarkFactory). Zbývající body, o kterých je známo, že nejsou
vyřešené. Nové položky přidat na konec příslušné sekce.

Stav zkontrolován po commitu `2b2bab17`, 30 stran, sazba bez varování.

**Celkem otevřeno: 8 položek** — všechny jsou už práce pro autora nebo kontrolu
rodným mluvčím. Žádná nečeká na vedoucího: způsob citací byl s ním ověřen a
zadaný rozsah písemně neexistuje.

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
| A5 | Metodika jako 3.1 místo samostatné kapitoly (kap. 2.4) | ⏳ viz E2 — totéž |
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
| B4 | Procházet teoretickou část s rodným mluvčím. Mechanický sken našel přes 100 nálezů, z nichž drtivá většina byly falešné poplachy (odsazení v Typstu, dvojice `claude claude` ve vyřazeném výpisu rozhraní), ale regex nerozezná kolokaci od chyby. | `pages/21`–`24` | ⏳ |
| B5 | Věta se třemi podřadicími členy bez interpunkce a s chybějící mezerou v `kdybyse`; relativní věta, která pohltila hlavní větu; `checkoutují` jako sloveso. | `pages/23-theory-agentic.typ` aj. | ✅ `1c5099d2` |
| B6 | Nadbytečná mezera na začátku odstavce (Typst ji vykreslí jako mezeru mezi slovy) a odkaz na obrázek stojící samostatně jako věta. | `pages/23-theory-agentic.typ`, `pages/22-theory-harness.typ` | ✅ `1c5099d2` |
| B7 | **Nález při čtení zdrojového textu.** V §2.3.2 zůstala za větou o hook middleware viset druhá polovina předchozí věty: sazba na str. 11 obsahovala „…pro deterministický běh. udělat. Druhou skupinu zajišťuje harness…", tedy duplikát i osiřelé „udělat.". | `pages/23-theory-agentic.typ` | ✅ |
| B8 | **Nález při čtení zdrojů, věcná chyba.** §2.4 připisovala zavedení pojmu software factory konferenci NATO v Garmischi. Nepravda: pojem formuloval Robert Bemer ve vlastním návrhu z roku 1968, který konference pouze projednávala. Popiseno podle první citace v @bemer-software-factory, životopisu @bemer-chm a vzpomínky @randell1968; zavádějící poznámka v bib odstraněna. | `pages/24-theory-factory.typ` | ✅ |
| B9 | Konec přímé citace byl ASCII `"`, který Typst vykreslil jako nízkou uvozovku; česká sazba vyžaduje vysokou. | `pages/24-theory-factory.typ`, `pages/33-practical-planning.typ` | ✅ |

Tvrzení o 28 % chatbotů a 0,36 % coding agentů ponecháno, ale už ne jako argument
práce, nýbrž jen jako představa o šíření nástrojů; viz H1. Průvodce v kap. 3.9 žádá
u statistik uvedení zdroje a metody; obrázek je opatřen citací
@gradually-ai-usage-2026 a popiskem, takže podmínka je splněna.

## C. Rozsah praktické části — vyřešeno rozdělením na dvě práce

Práce je rozdělena na dvě: tato (4. ročník, školní) a navazující (maturita).
Tím se otázka C1 vyřešila sama: popis počáteční implementace není kompromis,
ale předmět zkoumání. Navazující práce má popsat konečnou architekturu `df`.

| # | Co | Stav |
| :-- | :--- | :--- |
| C1 | Kterou revizi praktická část popisuje | ✅ rozhodnuto: `d576ec8f`, vymezení v §1.1 a §3.5 |
| C2 | Pasáž o pozdější konsolidaci byla `draft[]` a odporovala novému vymezení | ✅ `af23eaeb` — nahrazena odkazem na rozsah |
| C3 | Tabulka rozhraní osmi harnessů jako obrázek. **Rozhodnuto autorem: vyřazena.** Místo ní je v §2.3.3 jedna převzatá ilustrace rozhraní @fig-antigravity-subagents. Tabulka byla dokladem zachyceným spuštěním `--help`; argv deklarace zůstávají jedině v registru harnessů v repozitáři. | ✅ rozhodnuto |
| C4 | Položka `darkfactory` v bib byla necitovaná. Nyní je repozitář zmíněn v textu §3.5, tedy citován, a odkazuje na repozitář jako celek místo na konkrétní revizi. | ✅ `6b3e85f7` |

## D. Repozitář

| # | Co | Stav |
| :-- | :--- | :--- |
| D1 | `paper/.opencode/goals/` nebyl v `.gitignore` a objevoval se v každém `git status` | ✅ `4a0e2e73` |
| D2 | Práce je na větvi `docs/thesis`, jejíž historie patří dokumentům. Rozhodnuto ponechat. Na větvi přibývá i cizí práce (`README.md`), s touto se nijak nepletou. | ✅ rozhodnuto |
| D3 | `styles/draft.typ` není v dokumentu použit. Ponechán záměrně pro navazující práci; viz jeho hlavičku. | ✅ informativní |

## E. Vyžaduje rozhodnutí vedoucího práce — vyřešeno

| # | Co | Stav |
| :-- | :--- | :--- |
| E1 | **Způsob citací.** Průvodce přenechává volbu vedoucímu (kap. 5). | ✅ ověřeno s vedoucím, číselné citace odpovídají očekávání |
| E2 | **Umístění metodiky.** Viz A5 — zůstává otevřené, ale ne jako urgentní: přesun je mechanický a lze ho udělat kdykoliv. | ⏳ viz A5 |
| E3 | **Zadaný rozsah práce.** Hodnoticí protokol dává 10 bodů za „splnění zadaného rozsahu". Písemné zadání neexistuje, takže proti němu nelze práci ověřit a položka mimo autoritu autora. | ✅ neexistuje |
| E4 | **CSL šablona** `gjkt-iso690-numeric-cs.csl`. | ✅ součástí E1 |

## F. Kontrola před odevzdáním

| # | Co | Proč |
| :-- | :--- | :--- |
| F1 | Nechat zkontrolovat cizím okem celou práci, nejen jazykově. | Několikrát se ukázalo, že kontrola odhalí věci, které vlastní oko přestalo vidět. |
| F2 | Výpis rozhraní byl z práce vyřazen (C3), takže se v ní už nesrovnává s nainstalovanými nástroji. Registry v repozitáři zůstávají jediným místem, kde jsou argv deklarována, a je třeba je občas srovnat s nainstalovanými CLI. Všech osm nástrojů bylo ověřeno 27. září 2026, `claude` byl do té doby rozbitý a byl opraven; `agy` byl téhož dne ověřen znovu na `1.2.10`. | registr harnessů |
| F3 | Požádat vedoucího o zpětnou vazbu k novému názvu, výzkumné otázce a oddělení dvou prací. Změna názvu a přesunutí praktické části jsou věcné krok. | práce jako celek |

## G. Předání

| # | Co | Proč |
| :-- | :--- | :--- |
| G1 | `claude` CLI bylo v npm registrováno, ale nespustitelné: symlink ukazoval na neexistující cíl a nativní binárka se nikdy nestáhla, protože postinstall nikdy neběžel. Instalace byla opravena a rozhraní zachyceno z `--help` verze 2.1.283. | ✅ `6b3e85f7` |
| G2 | Zachyty `--help` leží v dočasném adresáři a nejsou součástí repozitáře. C3 nebylo přijato, takže do práce nedešly; pro případné budoucí srovnání by je bylo nutné uložit trvale. | ✅ nepotřeba |

## H. Provenance zdrojů

| # | Co | Stav |
| :-- | :--- | :--- |
| H1 | **Silnější zdroj pro údaje o adopci AI.** Rozhodnuto: `@gradually-ai-usage-2026` zůstává jako ilustrační zdroj a `@fig-gradually-usage` zůstává v úvodu, ale čísla nesmějí nést argument práce. Hledat primární či recenzovanou náhradu za podíl uživatelů chatbotů a coding agentů; pokud žádná není, ponechat formulaci výslovně jako odhad. Zdroj mimo jiné uvádí vlastní rozpětí 25–35 milionů a výslovně odmítá, aby bylo čteno jako údaj providera. | ⏳ |
| H2 | `@guild2026` (34 % autonomních pull requestů, 56 % oprav, 91 % bez zásahu inženýra) sestoupá do pozadí jako vlastní měření společnosti. V §2.4 se už nesmí podpírat tvrzení o tom, že popsaný průběh je běžná praxe. | ⏳ |
| H3 | `@bcg2026` a `@factory2026` zůstávají, ale jen pro definici a architekturu, nikoli pro číselné údaje. Jejich čísla jsoufootnotovaná na vendorské blogy. Průmyslové zprávy @anthropic-agents-2026 zůstávají jediným podkladem pro tvrzení o šíření agentů do výroby. | ✅ rozhodnuto |
| H4 | **Šablona CSL `note` nevypisuje.** Poznámky v `references.bib` se v seznamu zdrojů neobjeví vůbec, takže provenanci musí nést text a popisky obrázků, ne bibliografická poznámka. Šablonu schválil vedoucí (E4), proto se jí nedotýkat bez domluvy; pokud se má provenance zobrazovat, je třeba to nejdřív říct. | ✅ zjištěno |
