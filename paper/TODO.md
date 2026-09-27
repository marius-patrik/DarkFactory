# Otevřené body práce

Práce *Vzrůst Agentického AI: úvod do agentického inženýrství a implementace
software factory* (DarkFactory). Zbývající body, o kterých je známo, že nejsou
vyřešené. Nové položky přidat na konec příslušné sekce.

Stav zkontrolován po commitu `4a378768`, 38 stran, sazba bez varování.

**Celkem otevřeno: 6 položek** — pět je práce pro autora nebo kontrolu rodným mluvčím
(B1–B4, H1) a jedna (E2, umístění metodiky) je otevřená jen formálně: viz A5, kde je
původní rozhodnutí zrušeno a metodika zůstává v 3.1. Žádná nečeká na
vedoucího: způsob citací byl s ním ověřen a zadaný rozsah písemně neexistuje.

Sekce J zaznamenává čtyři tvrzení, která o popsané revizi neplatila, a opravy,
které z nich následovaly.

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
| A5 | Metodika — původně rozhodnuto přesunout do kap. 1 jako epistemickou podkapitolu. **Rozhodnutí zrušeno autorem:** teoretická část byla autorovi oznámena jako hotová a přesun by ji znovu otevřel. Metodika zůstává podkapitolou 3.1 uvnitř praktické části, jak uvádí `guide.md`, a nese tři podkapitoly: Protokol zdrojů, Tři kritéria, Otevřená otázka: složení vrstev. | ✅ zrušeno, viz E2 |
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
| B8 | **Nález při čtení zdrojů, věcná chyba.** §2.4 nejprve připisovala zavedení pojmu software factory konferenci NATO v Garmischi. Pojem formuloval Robert Bemer z General Electric ve vlastním návrhu; konference ho projednávala a sama o prvním užití neuvádí. Nyní stojí na primárním citátě ze zprávy konference (str. 94 původního číslování), ověřeném přímo v textu, a na životopisu pro samotné přisvojení pojmu. | `pages/24-theory-factory.typ` | ✅ |
| B10 | **Nepodložené tvrzení.** §2.4 tvrdila, že továrna „automatizuje provádění, nikoli rozhodování". Cusumano toto neuvádí; tvrzení nyní opřeno o skutečný záznam této diskuse ze zprávy konference (str. 95: Fraser, Ross, McIlroy) a o Bemera z roku 1977, podle něhož továrna potřebuje vycvičené lidi a metodiku, nejen nástroje. | `pages/24-theory-factory.typ` | ✅ |
| B11 | **Nedohledatelné zdroje vyřazeny.** Zmizel `@cusumano1991factory` (platno jen přes předplatné, pracovní verze na MIT DSpace vrací 405) a `@bemer-software-factory` (překlep v roce 1970, tedy příliš pozdější pro zavedení pojmu). Ani Bemůr papír *Economics of Program Production* (Information Processing 68, 1969, s. 1626-1627) není dostupný. Pravidlo: zdroj, který nelze číst, se necituje. | `components/bib/references.bib` | ✅ |
| B12 | **Planá vada, po zpětném šetření vyvrácena.** Str. 16 má jen 29 znaků, což původně vypadalo jako prázdná strana. Ve skutečnosti je to záměrný titulní list oddílu „PRAKTICKÁ ČÁST / DarkFactory", který má textu málo z podstaty. Žádná vada, nic neopravovat. | — | ✅ |
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
| H2 | `@guild2026` (34 % autonomních pull requestů, 56 % oprav, 91 % bez zásahu inženýra) sestoupá do pozadí jako vlastní měření společnosti. V §2.4 se už nesmí podpírat tvrzení o tom, že popsaný průběh je běžná praxe. Ověřeno v sazbě: čísla zůstávají, ale hned vedle nich stojí „jde ovšak o vlastní měření, nikoli o nezávislé ověření" a tvrzení o běžné praxi opírá @anthropic-agents-2026. | ✅ |
| H3 | `@bcg2026` a `@factory2026` zůstávají, ale jen pro definici a architekturu, nikoli pro číselné údaje. Jejich čísla jsoufootnotovaná na vendorské blogy. Průmyslové zprávy @anthropic-agents-2026 zůstávají jediným podkladem pro tvrzení o šíření agentů do výroby. | ✅ rozhodnuto |
| H4 | **Šablona CSL `note` nevypisuje.** Poznámky v `references.bib` se v seznamu zdrojů neobjeví vůbec, takže provenanci musí nést text a popisky obrázků, ne bibliografická poznámka. Šablonu schválil vedoucí (E4), proto se jí nedotýkat bez domluvy; pokud se má provenance zobrazovat, je třeba to nejdřív říct. | ✅ zjištěno |
| H5 | **Původ cílové smyčky opraven.** §2.3.3 připisovala goal loop ReActu (`@yao2022`), který o nadřazené smyčce s podmínkami přijetí nepíše. Nyní @huntley2025ralph jako původní text, @wiegold2026ralph jako popisná studie, @claude-goal a @openai-goals jako podklady k tomu, že je to dnes běžná funkce. `@yao2022` zůstává citováno v §2.2 u ReActu, kde patří. | ✅ |
| H6 | `gradually.ai`, `guild.ai`, `bcg`, `factory.ai` zůstávají v bibliografii, ale jejich číselné údaje se nesmějí objevit v textu jako měření. U Wiegolda to už je výslovně řečeno. Ověřeno přepisem: jediná věta s procenty v celé práci jsou čísla Guildu v §2.4, a jsou v téže větě označena za vlastní měření; procenta v úvodu jsou výslovně odhady. | ✅ |

## I. Materiály z čtení, které zatím nejsou v textu

Nalezeno při čtení zdrojů, vyhovuje závěru práce, ale zatím nevsunuto. Kandidáti na
§2.3.3 a na omezení výzkumu:

- **Rozhodující model je jiný než pracující.** Claude Code: `/goal` „adds a separate
  evaluator that checks your condition after every turn, so completion is decided by a
  fresh model rather than the one doing the work" @claude-goal. To je nezávislé
  potvrzení vlastního návrhu práce.
- **Hodnotitel nevidí do repozitáře.** „It does not call tools, so it can only judge
  what Claude has already surfaced in the conversation" @claude-goal. Cílová smyčka
  tedy nenahrazuje deterministickou bránu, protože posuzuje jen to, co pracující model
  sám ukázal. Nejsilnější materiál pro omezení, protože přiznává sám dodavatel.
- **Tři druhy bran v jedné větě.** „A Stop hook … can run a script for deterministic
  checks or a prompt for model-evaluated ones" @claude-goal. Přesně rozlišení, o které
  šlo v korekci brán.
- **Tři verdikty hodnotitele.** Not yet met / Met / Impossible @claude-goal. Model tedy
  může i běh ukončit záporným verdiktem, a existuje proto detekce zacyklení.
- **Lidská brána jako architektura.** „Pausing, resuming, clearing, and
  budget-limited transitions remain controlled by the user or the system"
  @openai-goals. A „Reaching a budget limit is not the same as completing the
  objective."
- **Smlouva o cíli o šesti položkách.** Outcome, Verification surface, Constraints,
  Boundaries, Iteration policy, Blocked stop condition @openai-goals. Přesnější
  slovník k plánování, než má práce dnes.
- **Zralost.** Thoughtworks Technology Radar má Ralph jako Trial, nikoli Adopt
  @wiegold2026ralph.

## J. Nepravdivá tvrzení o popsané reviz — opraveno

Kód byl ověřen přímo v revizi `d576ec8f`, ne v pracovním stromu, který se od té doby posunul. Čtyři tvrzení o popsaném průběhu revizi neodpovídala. Všechna jsou nyní uvedena jako vlastnosti popisované revize, bez oddělu „opravy" a bez omluvy v textu; opravy jsou v `c23caa69`.

| # | Co | Stav |
| :-- | :--- | :--- |
| J1 | §3.4 uváděla, že se opakovaný stejný nález bez progresu označí jako zablokovaný stav. Ve skutečnosti `Blocked` znamená **vyčerpanou kvótu**; porovnání digestů přišlo až v pozdější revizi (`21dfd85d`). Smyčka je ohraničena `MAX_REVIEW_ITERATIONS = 3`, oprava bez změny ukončí běh dřív a vyčerpání nezapíše žádný verdikt ani komentář. | ✅ `c23caa69` |
| J2 | Pořadí dvou bran bylo obrácené. Revize nejprve předá diff modelové review, až pak porovná změněné soubory se schváleným plánem; kód sám čísluje kroky `# 11. Self-review loop` a `# 12. Plan alignment gate`. | ✅ `c23caa69` |
| J3 | Schválení pull requestu bylo popsáno jako ověření autora issue nebo oprávněného člena. Je to **seznam dvou pevně zapsaných účtů** porovnávaný s `GITHUB_ACTOR` (`handle_pr_approval.py:216-225`) — ne autor issue, ne úroveň oprávnění. | ✅ `c23caa69` |
| J4 | Práce tvrdila, že review a testy jsou skutečnou překážkou. `verify_repository` je definována jednou a **volána jednou** (`agent_runner.py:2088`); výstup jde do promptu `fix` a druhý běh nenastane, takže změna s neprocházejícími testy dorazí do draft pull requestu. | ✅ `c23caa69` |

| # | Co | Stav |
| :-- | :--- | :--- |
| J5 | **Záznam opakovatelnosti nyní určuje revizi.** Bez určení revize nelze popis ověřit proti kódu, a právě na tomto místě se ukázalo, že čtyři výše uvedená tvrzení revizi neodpovídala. Věta je v §3.1, hned před výčtem čtyř vrstev. | ✅ `4a378768` |
| J6 | **V Typstu značí `*...*` tučné, nikoli kurzívu** (kurzíva je `_..._`). Sedm míst v revizovaném textu používalo `*...*` v úmyslu kurzívy, takže tiskla tučně — mezi nimi název příspěvku *Attention Is All You Need* a heslo *schopen* v §1.2. Všechna nyní `#emph[]`. | ✅ `4a378768` |
| J7 | Tři jazykové chyby nalezené čtením sazebného textu: „jako **tato** tři" v závěru, kolize pádu „považován **za** rovnocenný / první bráně" v §3.4 a chybné číslo korekce v komentáři §4.1. | ✅ `4a378768` |

| J8 | **Vysácená mezera za tečkou v anotaci.** V sazbě s `lang: "cs"` Typst nezkouší zlom řádku za tečkou, a když na konec řádku další slovo nevejde, mezera se místo zlomu smlčví — v tisku vyšlo „integraci změn.Strukturu", „přebírá od smyčky.kterou" a v anglickém abstraktu „integration.The". Anotace je nyní `#set par(justify: false)`, tedy na pravém okraji volná; text těla zůstává dvorečkovaný a v sazbě na str. 9 a 20 se vada neobjevuje. Podmínkou bylo, že blok nemá rezervu v šířce. | ✅ |
| J9 | **Malé písmeno na začátku věty v anotaci.** „navrhuje autor sám. úsudek o tom" — zdroj měl `úsudek` s malým `ú`. Vzniklo to z neúspěšného nahrazení, jehož shoda nebyla ověřena; od té doby je každé nahrazení v této práci kontrolováno na shodu. | ✅ |

| J10 | **Titulní list části přetékal na číslo stránky.** Karta „PRAKTICKÁ ČÁST / DarkFactory" měla na začátku `#v(1fr)`, čímž se obsah posunul na konec stránky a „DarkFactory" tiskl přes číslo stránky. Vodorovné a svislé vycentrování je správně `#align(center + horizon)`; samotné `1fr` před obsahem obsah dolů zarovná. Vizualizováno na s. 17. | ✅ |
| J11 | **Ovdal na 3.4.** §3.4 přetékal na stranu 26 dvěma řádky. Zkrácení o 125 znaků, všechny byly v redundanciích („na níž se tato kapitola opírá", „kterou práce zaznamenává"), stránka zmizela a práce má 37 stran místo 38. Obě korekce v §3.4 zůstaly doslova. | ✅ |

| J12 | **Trojice kritérií se v práci nikde neuplatnila.** §3.1 kritéria zavádí jako měřítko, kterým se má odpovědět na výzkumnou otázku, §3.5 hlásí, že třetí je oslabené zástupným schválením, ale ani Zjištění, ani Diskuse, ani Závěr kritéria nepoužily. Jde o logickou mezeru, kterou by na obhajobě chtěla každá komise. §4.1 nyní závěrečný odstavec kritéria na zjištění převádí a říká, že první dvě plní a třetí podmíněně, za podmínky, kterou sama zaznamenává. **Rozsoud o tom, zda konfigurace třetí kritérium splňuje, je záměrně nepronášen a patří autorovi.** | ✅ |
| J13 | **Opakování v prvním zjištění.** §4.1 znovu popisoval tok události přes GitHub Actions, kontejner a runner, který §3.2 vykládá podrobně. Zkráceno na odkaz, čímž se uvolnilo místo na J12 bez přidání stránky. Odkaz na §3.2 je symbolický (`@architektura`), aby v práci nezůstala tvrdá čísla sekcí. | ✅ |

| J14 | **Páté nepravdivé tvrzení, navíc proti sobě.** Čtvrtá vrstva záznamu opakovatelnosti tvrdila, že se review „opakuje do té doby, než se uzavře poslední nález". To odporuje korekci J1 ve stejné kapitole, podle níž je smyčka ohraničena třemi iteracemi a může skončit bez verdiktu. Záznam měl podle zadání zůstat v podstatě beze změny, ale tvrzení, které práce sama popírá, ponechat nelze. Změněno na „dokud poslední nález nezmizí, v popsané revizi však nejvýše třikrát". Ostatní tři vrstvy proti kódu odpovídají; ověřeno mimo jiné, že plán je skutečně child issue přes `--parent`, že merge používá `--delete-branch` a že `agent.yml` má podmínku na úrovni jobu `vars.AGENT_ENABLED == 'true'`. | ✅ |

| J15 | **Tabulka 1 neodpovídá předloze, kterou zobrazuje.** Předloha `request.yml` má v `d576ec8f` šest polí; tabulka jich uvádí pět a vynechává `Parent Epic`, aniž by to přiznala. Popisek nyní říká, že jde o vybraná pole, a vynechané pole jmenuje. Ostatní názvy polí (`Verbatim User Request`, `Area / Component`, `Request Type`, `Proposed Acceptance Criteria`, `Additional Context`) souhlasí s předlohou. | ✅ |
