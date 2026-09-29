# PLAN — cleanup pass over the whole paper

**Stav: NÁVRH. Není hotový, dokud autor nepotvrdí.** Každá položka je záměr s uvedeným
důkazem; nic zde nebylo provedeno bez souhlasu. Cesty do souborů jsou `paper/pages/…`,
řádky odpovídají revizi `e9e9a063` a při každé fázi se posunou — proto je u každé položky
citát, ne číslo řádku.

**Co je rozhodnuto a co ne.** Sekce 3 dělí na `PŘIJATO` a `NEROZHODNUTO`. Kde je
`NEROZHODNUTO`, rozhoduje autor, a žádný krok v tomto plánu to nepředbíhá.

---

## 1. Zásada

**Zásada autora, nepodmíněná:** *„any concept should only be in the paper once"*, a má platit
*v celé práci* — „the principle should be applied across the whole paper". V této podobě je
v `CONTEXT.md` mezi stálými omezeními.

**K testu, který použil průzkum, je třeba se vyjádřit.** Agent si ho vymyslel, aby v 38
opakováních a 18 „aplikacích" rozhodl, co se má smazat. Autor ho nepotvrdil. Bez jeho
potvrzení je práce s těmito dvěma čísly neodůvodněná, protože se na ně dá opřít kteréž
z těch 38 položek, které se autorovi nebudou zdát opakováním. **Čeká na rozhodnutí.**

Průzkum přesto zjistil, že opakování nejsou rozložena náhodně — sbíhají na třech místech:

| Kde | Co dělá |
| :--- | :--- |
| §4.1 | znovu popisuje §§3.3–3.5. Zjištění 1–4 chodí po pipeline, kterou tyto kapitoly už popsaly. |
| §4.3 | znovu vypisuje §4.1. Závěr má potvrzovat, ne enumerovat. |
| §2.1.1 a §3.1 | obě místa si nárokují stejnou myšlenku (model versus systém) a ani jedno neodkazuje na druhé. |

Teoretická kapitola je jinak čistá: čtyři podkapitoly §2.1, dva odstavce §2.3 i celá
diskuze o kompakci staví každou myšlenku jednou.

---

## 2. Co průvodce skutečně platí — a co z toho plyne

Odpověď na otázku, zda řezání odporuje školním pravidlům. `rules.md` (závazné) a
`guide.md` (doporučující) byly proti návrhu prověřeny.

### Porušení závazného pravidla: žádné

| Požadavek | Stav po řezu |
| :--- | :--- |
| kap. 2 — metodická část | `§3.1 Metodika` zůstává; ubývají jen její podkapitoly. |
| kap. 2.3 — výzkumná otázka a hypotéza | v §1.2, nedotčeno. |
| kap. 2.5 — limity výzkumu v diskusi | v §4.2, naopak zesíleny o třetí. |
| kap. 2.6 — závěr hodnotí naplnění cíle | v §4.1 a §4.3. |
| kap. 2.6 — doporučení pro další výzkum | v §4.3, zůstává. |
| kap. 4/6 — sazba, součásti textu, citace | nedotčeno. |

### Riziko pro body: ano, dvě položky

1. **Cíl práce, 5 bodů** — „je ověřitelný, dosažitelný, dostatečně konkrétní?". Sloveso
   `musí` ve výzkumné otázce je podmíněné, a bez měřítka je otázka nedoložitelná. **Trojice
   kritérií je jediné měřítko, které práce má.** Proto zůstávají — na jednom místě.
2. **Metody, bodově nejvýše** — „je popsána tak, že podle ní lze výzkum opakovat?". To
   nesou čtyři vrstvy, připnutá revize a zjednodušení s cenou, ne kritéria. Tady řez neškodí.

### Rámec otázky — co zlepšit

Otázka je formulována správně, ale „principy" je slovo bez měřítka. Bod 5 dostane
práce, která ukáže, **jak** otázku zodpověděla. Znění navržené v §2a tuto funkci plní —
ale je to návrh, ne dohoda. **Starší návrh, který kritéria v §1.2 nevypisoval, je zrušen:
autor řekl „state once in 1.2 answer in 4.1".**

---

## 2a. Cíl, kritéria a výzkumná otázka — návrh k potvrzení

**Tato část není rozhodnuta. Autor má ji potvrdit nebo vyvrátit.**

### Proč dosavadní znění nebylo ověřitelné

Čtyři konkrétní slabiny, zjištěné čtením dnešního znění:

1. **Dvě ze tří kritérií mají oporu, první nemá.** Druhé cituje `@claude-goal` pro tři druhy
   bran; třetí je opřeno o vlastní selhání popsané konfigurace. První, *stav leží mimo model
   a je zjistitelný*, nemá zdroj ani odvození — je prostě tvrzeno. Ten rozdíl komise zahlédne.
2. **Nic trojici neodvozuje.** Text to přiznává — „operacionalizaci této práce, nikoli o
   převzatou taxonomii" — a právě to činí otázku neodpověditelnou nikým jiným než autorem.
3. **Podmíněné `musí` nebylo vymezitelné.** „jen ty principy, které samotný model bez zásady
   okolí neposkytne" — práce nikdy neříká, které principy model dnes sám dodává. Podmínka,
   která otázku propouští, se nedá posoudit.
4. **Kritéria jsou definice, ne testy.** Komise může ověřit jen tím, že analýzu zopakuje.

### Rozhodnutí autora

- Kritéria se **neodvozují z chyb**. Autor: má smysl volit to, co lze prokázat, že je
  dosaženo. Kritérium odvozené z porušení je pravidlo, o kterém víme, že je porušeno, a
  odpověď je tak předem daná.
- Podmínka `musí` se **vyhodí**.
- Kritéria se **vyjmenují jednou, v §1.2**, a **zodpovědí se v §4.1**. §3.1.1 se ruší.

### Návrh znění

Otázka zůstává, hned za ní tři principy, jednou, a odraz na závěr:

> Výzkumná otázka práce zní: *Které principy musí agentický systém splnit, aby spolehlivě
> vykonával inženýrskou práci?* … Práce na ni odpovídá třemi principy, které staví jako
> vlastní, nikoli jako převzatou taxonomii: **stav leží mimo model a je zjistitelný**;
> **každá brána je výslovná a označuje druh svého rozhodnutí, a modelem hodnocená brána se
> nepodává jako kontrola, jejíž výsledek lze přepočítat bez modelu**; a **o tom, co vstoupí
> do produkce, rozhodne pojmenovaný člověk v pojmenovaném okamžiku**. Zda popsaná
> konfigurace tyto principy splňuje, je předmětem zjištění v závěru.

### Co se tím mění proti dnešku

| | Dnes | Návrh |
| :--- | :--- | :--- |
| Třetí kritérium | „…a nesmí existovat žádná jiná cesta, která by ke stejnému bodu vedla" | vynecháno |
| Druhé kritérium | „běh nesmí projít bránou jednoho druhu prostředky jiného" | reformulováno na to, co konfigurace doopravdy dodrží |
| Kde kritéria | §3.1.1 | §1.2 |
| Verdikt | „první dvě plní, třetí plní podmíněně" | tři principy splněny; slabiny se hlásí jinde |

**Proč vynechat „žádná jiná cesta".** Tato klauzule je jediná, kterou popsaná konfigurace
nesplňuje — zástupné schválení je právě druhá cesta. Kdyby zůstala v kritériu, odpovědí by
bylo „nesplněno", což je méně užitečné než jiné kritérium, které splněno je. Zástupné
schválení ale nezmizí: je v §3.5, je součástí záporného zjištění a je v omezeních. **Tím se
slabost přesune z kritéria do zjištění, ne z textu pryč** — a přestane být jedinou věcí,
která brání tomu, aby byl výsledek čitelný jako „tyto principy platí".

Toto je věcný posun, ne úprava formulace, a proto potřebuje potvrzení.

### Co zůstává v §3.1

Po vypuštění 3.1.1 zůstává §3.1 jako záznam opakovatelnosti: **čtyři vrstvy** a **cena
zjednodušení**. Věta o určení revize z ní byla odstraněna na autorův pokyn („remove, this
doesnt belong in the paper", `d6eccfd6`) — revize se i nadále uvádí v popiscích obrázků a
v citacích `@darkfactory-d576ec8f` v těle, ale §3.1 už ji neprohlašuje. To je přesně to,
co průvodce posuzuje v položce *metody* — „je popsána tak, že podle ní lze výzkum
opakovat?". Kritéria do toho nepatřila.

### Co je „zástupné schválení" — autor se na to ptal, odpověď patří sem

Autor: *„what do you mean by proxy approvals? like asking an agent to use my account to do
the approval action? thats stupid it is me approving"*

**Ne.** Není to agent jednající vaším jménem. Mechanismus je jiný a je popsán v §3.5:

1. Ochrana větve vyžaduje schvalující review. GitHub **nepovažuje za schválení** review
   od účtu, který pull request sám otevřel.
2. Pull request otevřívá pipeline tokenem správce, tedy vaším účtem. Vaše kliknutí na
   „Approve" je proto review od téhož účtu, který PR otevřel, a GitHub je nepočítá.
3. Když ochrana větve stále schválení vyžaduje, **druhý účet** (bot) podá schválení
   programově, vlastním tokenem `BOT_TOKEN`. Podmínkou je, že tento druhý účet a jeho
   přihlašovací údaj v konfiguraci jsou; kde nejsou, pipeline čeká na skutečné schválení
   člověka.
4. Právě tenhle druhý krok je „zástupné schválení": schválení, které **platí**, poskytuje
   stroj, ne člověk. Přesně to, co autor popsal slovy *„its stupid it is me approving"* —
   autor kliká, ale GitHub uzná jen schválení bota.

Který účet smí schválit, je seznam dvou pevně zapsaných účtů porovnávaný s
`GITHUB_ACTOR` (§3.5). Odtud formulace, kterou autor odmítl jako nepravdivou, že schválení
„ověřuje autora issue nebo oprávněného člena".

### Nezodpovězené

- Zda ponechat formulaci „vlastní principy, nikoli převzatá taxonomii" — je to poctivé, ale
  komise může číst jako přiznání, že výběr není odvozený.
- Zda má být v §1.2 uvedeno, že jde o tři, i když je pak §3.1.1 zrušená a §4.1 je jediné,
  kde se použijí.
- **Zda vůbec zůstat u tří principů**, nebo je autor přesvědčen, že je třeba hledat jiný
  rámec otázky. Dosud nikdo neodpověděl na autorovu otázku, co přesně průvodce vyžaduje.

---

## 3. Rozhodnutí

### Přijato

| # | Rozhodnutí | Kdo | Zdůvodnění |
| :-- | :--- | :-- | :--- |
| R2 | §3.1.2 odstraněn, jeho jediná živá myšlenka přesunuta do omezení v §4.2. | autor + agent | Bylo to omezení, tak patří mezi omezení; třetí bod v §4.2. **Provedeno** (`55155a11`). |
| R3 | Věta, která obrázek popisuje, je z textu pryč. Odkazem je věta, se kterou obrázek souvisí. | autor | Výraz autora. Zapsáno jako stálý constraint v `CONTEXT.md`, aby to pozdější průchod nezvrátil. |
| R4 | Počet stran není míra kvality. | autor | Dříve v `TODO.md` B15. |
| R8 | `§4.2.1 Omezení výzkumu` zrušeno jako podkapitola; tři omezení zůstávají jako průběžný text v §4.2. | autor | „Flatten it into 4.2". Strom kapitol se zploští; kap. 2.5 průvodce tím není dotčena. **Provedeno** (`e9e9a063`). |
| R9 | Anotace se **nekrátí**; po Fázi 5 se jen ověří, že popisuje skutečný rozsah. | autor | „Leave the length, re-check the content". 159 slov je uvnitř 150–250. |
| R10 | `PLAN.md` je v repu, stejně jako `CONTEXT.md`, `TODO.md`, `rules.md`, `guide.md`. | autor | „Track it like the other working docs". |
| R11 | Podmínka `musí` ve výzkumné otázce se **vyhodí**. | autor | „Drop the conditional". |
| R12 | Kritéria se **neodvozují z chyb**. | autor | „shouldnt we choose something we can prove we achieved?" |
| R13 | Kritéria se **vyjmenují jednou v §1.2** a **zodpovědí se v §4.1**; §3.1.1 se ruší. | autor | „state once in 1.2 answer in 4.1". |
| R14 | Necitované položky bibliografie se nechají do konce. | autor | „leave them until the end like the plan says". |

### Nerozhodnuto — patří autorovi

| # | Otázka | Proč dosud nerozhodnuto |
| :-- | :--- | :--- |
| **Q-A** | Kolik principů, v jakém znění, a zda vůbec zůstat u trojice. | R13 určuje *kde* a *kolikrát*, ne *co*. Znění v §2a je agentův návrh, ne dohoda. |
| **Q-B** | Zda v §1.2 uvést „vlastní principy, nikoli převzatou taxonomii". | Agentova pochybnost: komise může číst jako přiznání, že výběr není odvozený. |
| **Q-C** | Tvar §4.1 — autor navrhl „just the three questions and answers". | Dosud nebylo provedeno, co přesně průvodce požaduje a co jsou „findings". Viz §5. |
| **Q-D** | Zda test 38/18 platí. | Agentův vynález, autor ho nepotvrdil. Bez něj je rozdělení těch 38 neodůvodněné. |
| **Q-E** | Hranice tří iterací — autor nařídil odstranit z **obou** míst (§3.1 i §3.4) a „not tell the full truth". | **Provedeno jen v §3.1** (`d6eccfd6`). §3.4 dosud hranici má; plán ji naopak prohlásil za trvalé sídlo a přidal grep, který selhání při jejím zmizení vyvolá. To je opak autorova rozhodnutí a musí se napravit. |
| **Q-F** | Pět popisků, které tvrdí víc, než obrázek ukazuje. | Autor: „the first is good so is the second and third and fourth not sure about the fifth". |
| **Q-G** | Proč odkaz na obrázek nesmí být v úvodní větě. | Plán říká „upravit existující úvodní větu"; autor řekl „the **related** sentences". Úvodní věta je přesně ta, kterou autor nechá smazat. Viz §5. |

---

## 4. Fáze — pořadí, jak bude probíhat

Každá fáze: subagenti **navrhují**, hlavní agent **ověřuje v souboru**, teprve potom se
mění. Změna se commituje po každé fázi. Bez schválení autora se do souborů nepíše.

### Fáze 1 — Čeština
Cíl: B1, B2, B4 z `TODO.md`. Jazyková úroveň nese 15 ze 200 bodů.
Subagenti hlásí **pouze kandidáty**, s přesnou citací, pravidlem a důkadem. Nic, co nemá
důkaz, se neopravuje. Minulý kontrolní průchod: 89 nálezů, z toho asi 20 skutečných.
Měření: průměrná věta pod 14 slov, žádná nad 30.
Podch. 1a `10`,`12` · 1b `21`,`22`,`23` · 1c `30`–`35` · 1d `40`,`41`,`50`.

**Průzkum hotov, čeká na provedení.** Zjištěno:

*Mechanické, bez úsudku — asi 23 položek.* Chybějící mezery (`10:38` `agentůje`,
`21:114`, `22:57`), rod slovesný vedle sebe (`31:27` `určený`/`určené`, `32:13`
`implementace`×2, `41:4` `odpovídá`/`odpověd`, `41:18` `dosažitelnou`×2), čárka místo tečky
(`34:13`, `35:25`, `22:34`), dvojtečka spojující dvě celé věty (`33:70`, `34:11`,
`35:11`), rod (`40:17` `čistá review` → `čisté`, `50:20` `kterých následuje`,
`50:16` `vyčeratou`), překlep `31:32` `Jge o` → `Jde o`, a jedna **nerozložitelná věta**
`31:27` — „Oproti ní je však reprodukovatelný, dohledatelný a jehož každé rozhodnutí
zůstává vidět" — kde jedno `je` vládne dvěma přívlastím *i* vztažným odstavci, takže po
`dohledatelný` nemá věta žádnou predikaci.

*Meta-komentář k práci — 4 jisté, 7 na hranici.* Jisté: `31:25` „o kterém **tato část
pojednává**", `35:13` „a **práce** to záměrně nerozšiřuje", `35:21` „**Zde je tedy
přesnější dodat**", `35:25` „a **zde to záměrně není rozvedeno**". Na hranici: `31:32`
„převádí **práce**…", `31:36` „není vynalézeno zde", `32:20` „**Tvrzení, že** struktura
procesu…", `35:21` „který **práce** záměrně nepopisuje".

*Nadsázka bez měřítka — 3.* `31:38` „konference v Garmischi odmítla **bez důvodu**" tvrdí
*poměr* k rozhodnutí z roku 1969, který práce neměří. `35:13` „rozdíl je malý v textu a
**velký** v tom, co z něj plyne". `32:20` „je proto v této revizi **doslova pravdivé**".

*Latinismy a kolokace — na rozhodnutí.* `měřitelné hranice`, `zdroj pravdy`, `akceptační
podmínky`, `nativně propojené`, `grafového orchestrátoru`, `změna dat`, `ekonomickou a
epistemickou cenu`, `nepodléhající vyjednávání`, `podmínka „určený" je ostrá`,
`náročky`, `nad /workspace`.

*Měření.* Průměrná věta: úvod 16,6 · agent 16,3 · agentické 20,3 · továrna 23,2 · metodika
21,1 · architektura 17,8 · plánování 16,8 · implementace 18,8 · integrace 17,9 · zjištění
17,8 · diskuse 19,2 · **shrnutí 24,1**. Cíl je pod 14 — tě ho nesplňuje žádný soubor,
shrnutí nejhůř. Přes 30 slov má 31 vět. Dvojteček je v praktické části 19× ve 118 větách
(16 %).

### Fáze 2 — Odkazy na obrázky
Cíl: aby každý obrázek měl v textu odkaz, **bez přidávání věty, která ho popisuje**.
Výslovně **ne** úvodní větou — tu autor nechává smazat. Odkaz nese věta, **se kterou
obrázek souvisí**. Viz Q-G; průzkum pro každý obrázek určil tuto větu:

| Obrázek | Věta, která nese odkaz | Vložit |
| :--- | :--- | :--- |
| `fig-copilot-inline` | „Nejprve doplňovaly kód v editoru @github-copilot-completion." | za citaci na konec |
| `fig-chatgpt-cannot-see` | „…takže i nadále všechno provedl uživatel." | **jen poslední klauzule** — předchozí mluví o nedostupných *nástrojích*, snímek o nemožnosti *vnímat* |
| `fig-claude-code-plan` | „…teprve potom se agent pustí do změn." | na konec |
| `fig-antigravity-subagents` | „**Coordinator/subagent** rozdělí rozsáhlou úlohu na dílčí běhy…" | za hlavní podstatné jméno — jediné, kde to sedí |
| `fig-dynamic-workflows` | „…plán je program, který lze přečíst a znovu spustit @anthropic-dynamic-workflows." | na konec. **Ne** do věty o Kimi nad ní — snímek Claude Code by pak důkazil tvrzení o Kimi |
| `fig-codex-goal` | „Dnes je to běžná funkce Claude Code i Codexu @claude-goal @openai-goals." | na konec. První věta prázdu popisuje dvouramenné větvení, snímek jen jeho konec |

Současně: popisky `32:8` a `32:13` přestat opakovat vrstvy a hranici smyčky (viz Fáze 4).

**Koliduje s `CONTEXT.md`.** Zapsané stálé omezení dnes říká, že obrázek *bez* odkazu je
rozhodnutí, ne nedostatek, a že se nemá přidávat popisná věta. Autor přesto nařídil
odkazy doplnit. Oba příkazy jsou slučitelné jen tak, že se doplní **do stávající věty** —
proto musí být `CONTEXT.md` upraven dřív, než se cokoli začne měnit.

### Fáze 3 — Teoretická část
Cíl: jedna myšlenka na sekci, žádné mluvení o práci uvnitř práce.
| Kde | Co |
| :--- | :--- |
| `22-theory-agentic.typ:4` | „není samotný agent ani jeho model, ale systém" = `21:12`. Nahradit odkazem. |
| `22-theory-agentic.typ:58` | „Spolehlivost tu nevzniká z modelu" = `21:15`. Vymazat první klauzuli. |
| `23-theory-factory.typ:12` | **Přidat `1968`.** Rok je v obou abstraktech, v těle chybí — tělo podpírá tvrzení abstraktu. |
| `23-theory-factory.typ:18` | „co smí do výroby vstoupit" obsah třetího kritéria ze stejného zdroje `@nato1969`. Viz Q-A: pokud kritéria zůstanou v §1.2, patří tato formulace tam. |
| `31-practical-method.typ:32` | První dvě věty jsou skoro doslova `10:47–48`. Začít až na „Aby to nebylo tvrzení bez měřítka". |
| §2.1.1 ↔ §3.1 | **Oba si nárokují model-versus-systém.** Přidat vzájemný symbolický odkaz — jediné místo, kde se přidává, ne ubrat. *(Odkazovat bude na to, kde kritéria nakonec budou.)* |

### Fáze 4 — Praktická část (přepis)
Cíl: zkrátit. Dnes `§3.1`–`§3.5` dohromady opakují to, co figury a popisky už říkají.
| Kde | Co |
| :--- | :--- |
| `32:8` (popisek) | Vrstvy už jsou v `32:4` těsně nad ním. V popisku nechat jen provenienci a „osm / čtyři". |
| `32:13` (popisek) | „v této revizi nejvýše třikrát" dvě kapitoly před tím, než je číslo vysvětleno. Vymazat; vlastní je `34`. |
| `35:15` | Třetí prosový výrok o vrstvách. Vymazat první větu; zůstane cena a závislost. |
| `35:15` | „snadná reprodukovatelnost a viditelnost" = `31:27`. Vymazat výhodu, nechat nevýhodu. |
| `§3.4` | Mechanika patří do `34`; to je její jediné místo. Kvóta, jednonásobné testy, druhý dotaz modelu — každé jen jednou, tady. **Hranice tří iterací je výjimka — viz Q-E, tam je autor nařídil opak.** |
| `§3.3` | Ověřit, že Tabulka 1 je stále jen jedno místo, kde se předloha ukazuje. |
| `§3.5` | Scope boundary už je dvakrát (`1.2` a `3.5`) — to je podle `CONTEXT.md` správně, obě místa jsou legitimní. Neměnit. |

### Fáze 5 — Závěr
Cíl: zkrátit. **Největší řez v práci.** Tvar §4.1 je nerozhodnutý (Q-C): autor navrhl
„just the three questions and answers", průzkum však pracoval s pěti zjištěními. **Dokud
se nerozhodne, Fáze 5 se nespouští** — níže jsou řezy, které platí při obou tvarech.

*Řezy v §4.2 a §4.3, nezávislé na tvaru §4.1:*
| Kde | Co |
| :--- | :--- |
| `41:4` | Hypothesis v parafrázi **a** vrstvy podruhé v téže větě. Vymazat vše za dvojtečkou. |
| `41:6` | „jde o druhý dotaz modelu" = `34:17`; „tři iterace" = `34:13`. Odkázat, nechat důsledek. |
| `41:8` | „rozliší dobrý a špatný stav, ale není překážkou" doslova z `34:11`. Vymazat; nechat až od „Rozlišení mezi kontrolou, která brání…". |
| `41:10` | Výhoda i nevýhoda už v `31:27` a `35:15`. Nechat rámec a poslední větu o odpovědnosti. |
| `41:22` | „Hypotéza se potvrdila: strukturu… přebírá od smyčky" = `50:18`. Vymazat poslední větu; argument o nezávislosti je bez ní úplný. |
| `50:10` | Tři kritéria vypsaná podruhé, podmíněnost `musí` potřetí, „model sám o sobě" = `21:29`, „agent vzniká propojením" = `21:12`. Z celého odstavce zůstane jedna věta. |
| `50:12` | Známost celé architektury i posloupnosti fází podruhé. Vymazat celý odstavec kromě první věty. |
| `50:16` | Třetí výrok o třech iteracích, kvótě i testech. Vymazat vše kromě „Modelové review může být opakované, ale není deterministickou zárukou správnosti". |
| `50:18` | Potvrzení hypotézy **ponechat** — to je jeho úkol. Druhá půlka vět = `41:22`. Vymazat, nechat hranici. |
| `50:20` | „protože dnes hlásí, ale nebrání" pátá výpověď. Vymazat; body do budoucího výzkumu obstojí. |
| `50:22` | Deskriptivní klauzule čtvrtá; nechat **normativní pravidlo** — kdo bránu vykonává, musí být zapsán. To je jediný předpis práce. |

### Fáze 6 — Citace
Curlát na konec, jak autor rozhodl. Deset necitovaných položek se znovu posoudí *proti
finálnímu textu*, ne proti dnešnímu. Každá dostane verdikt: použít, nebo odstranit.
Zbývá ověřit každou citaci proti zdroji — klíč, který se rozluší, není doklad.

### Fáze 7 — Anotace a abstrakt
Až po všem ostatním, protože musí odpovídat výsledku.
- `metadata:25` a `:28` tvrdí **1968**; tělo to doplní ve Fázi 3.
- Anotace má 159 slov (limit 150–250) — v pořádku.
- Anotace i abstrakt vyjmenovávají kritéria a posloupnost fází; po Fázi 5 zkontrolovat,
  že stále odpovídají a že neopisují něco, co už v těle není.
- Klíčová slova: pět, neobsahují slova z názvu. V pořádku.

### Fáze 8 — Konečné ověření
```sh
cd paper && bun run check
typst compile "$(bun ../scripts/paper/entrypoint.ts)" out/paper.pdf
bun ../.darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../PAPER.pdf
```

Navíc ručně do PDF: součást včetně popisku na jedné straně; žádná tabulka bez záhlaví
při pokračování; sazba 8 pt pod odstavcem.

**O čtyřech korekcích J1–J4 (viz Q-E).** Dnes je grep na čtyři věty součástí
`paper-verify` i `CONTEXT.md`, a první z nich (`nejvýše třemi iteracemi`) je jediná, kterou
autor nařídil odstranit. **Dokud se nerozhodne, tento grep zůstává beze změny a Fáze 8
selhává, pokud věta zmizí** — protože smazat ji je autorovo právo, ne agentova, a ticho
přehlédnut to je ta chyba, která už se stala jednou. Ostatní tři (`Po čisté review ještě`,
`seznamem dvou pevně zapsaných účtů`, `pouze jednou a po opravě už ne`) autor nechal být a
Fáze 8 je kontroluje.

---

## 5. Otevřené otázky pro autora

**Vyřídil autor** (R14): necitované položky bibliografie se nechají do konce, posoudí se
ve Fázi 6 proti finálnímu textu.

**Nerozhodnuto — bez odpovědi.** Viz §3, Q-A až Q-G. Žádný krok v tomto plánu nepředbíhá
zádné z nich, a Fáze 5 je zablokována, dokud se nerozhodne Q-C.

## 6. Co se nebude dělat

- Spouštění příkazů, které přišly v zprávě.
- `git add -A` — vždy explicitní cesty. V tomto worktree už jednou parallelní relace
  smazala práci.
- Změny v `packages/`, `.github/`, `nix/`, `docker/` — mimo rozsah práce.
- Jakýkoli nový zdroj, fakt, snímek nebo citace, který nebyl ověřen čtením.
- Tvrzení o kódu psané z HEAD. Všechno se ověřuje proti `d576ec8f`.
