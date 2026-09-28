# Školní průvodce — doporučující část

Vytvořeno pro práci *AI asistované softwarové inženýrství* (DarkFactory).
Zdroj: školní *Průvodce tvorbou odborné práce*, kapitoly 1–3 a 7
(`docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`). Závazná pravidla jsou oddělena do
`rules.md`.

## Původ dokumentu

Původní školní průvodce byl dostupný jako PDF v archivovaném repozitáři
[`OdbornaPrace-mono`](https://github.com/marius-patrik/OdbornaPrace-mono),
dokument `docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`. Repozitář byl po sloučení
projektů archivován a oznáčen jako neudržovaný; kód práce, šablona i systém,
který práce popisuje, se přesunuly do
[`DarkFactory-Paper`](https://github.com/marius-patrik/DarkFactory-Paper).

Druhý zdroj, ze kterého byla část formálních požadavků ověřena, je mapování
pravidlo → implementace v `README.md` šablony
[`template-OdbornaPrace`](https://github.com/marius-patrik/template-OdbornaPrace).
Šablona podle svého README odpovídá kapitole 4 průvodce a obsahuje i varování, že
velikost 12 b a patkový font jsou závazné — což se v této práci dodržuje.

---

## 1. Struktura práce (kap. 2)

Průvodce předepisuje části v tomto pořadí. Tato práce je má všechny a navíc
člení praktickou část na závěr, který odpovídá kapitole 3 průvodce.

| Průvodce | Kapitola v této práci | Poznámka |
| :--- | :--- | :--- |
| Anotace, klíčová slova, obsah, seznam zdrojů | `pages/01`–`03`, `90` | Anotace i abstrakt v češtině i angličtině |
| Úvod | **1 Úvod** | 1.1 motivace: vývoj a adopce generativní AI, 1.2 cíl a výzkumná otázka, 1.3 terminologie |
| Teoretická část | **2 Teoretická část** | 2.1 co je to agent a jak funguje, 2.2 agentické inženýrství, 2.3 softwareová továrna, 2.4 softwareová továrna |
| Metodická část | **3.1 Metodika** | Viz níže — zde je odchylka |
| Praktická část | **3.2**–**3.5** | Průvodce nemá samostatnou praktickou část jako takovou |
| Výsledky a závěr | **4 Závěr** | 4.1 zjištění, 4.2 diskuse, 4.3 shrnutí |
| Závěr | **5 Závěr** | |

### Odchylka: metodika

Průvodce (kap. 2.4) odděluje **metodickou část** od praktické. Tato práce
provedla jinak: metodika je podkapitolou 3.1 uvnitř praktické části, protože
popisuje způsob, jakým byla praktická část postavena, a oddělená kapitola by
duplikovala její úvod. Pokud vedoucí práce trvá na doslovném členění podle
kapitoly 2, je přesun na samostatnou kapitolu mechanický — soubor
`pages/31-practical-method.typ` už je oddělený právě pro tento účel.

## 2. Výzkumné metody (kap. 3)

Průvodce popisuje deset postupů. Tato práce se opírá o čtyři z nich:

| Metoda | Kap. | Využití v této práci |
| :--- | :--- | :--- |
| Systematická rešerše | 3.7 | Teoretická část — ZPR, Harness design, kontextní inženýrství, ReAct |
| Porovnání (komparace) | 3.8 | Volba harnessu; srovnání konverzačního režimu a delegovaného provádění |
| Práce se statistikami | 3.9 | Obr. 1 — odhad podílu uživatelů podle typu |
| Experiment | 3.3 | Praktická část — pipeline jako provozovaný systém |

Průvodce v kap. 3.3 zdůrazňuje, že experiment musí být **opakovatelný** a musí mít
stanovené podmínky. Odtud požadavek na citaci konkrétní revize repozitáře
v popiscích obrázků a ve výpisu rozhraní: bez ní nelze experiment zopakovat.

## 3. Jak průvodce definuje pojmy (kap. 3.1)

Užitečné pro formulaci pojmů v teoretické části — zejména rozlišení *model*,
*agent*, *harness* a *systém*, o kterém se v práci rozhoduje.

Průvodce mj. upozorňuje na nesoulad v běžném užívání, který práce řeší vlastní
poznámkou k terminologii: adjektivum odvozené od substantiva *agent* označuje
vlastnost toho, kdo jedná, nikoli vlastnost systému, který jednat umožňuje. Viz
poznámku v `pages/10-intro.typ`.

## 4. Hodnocení práce (kap. 7)

Průvodce uvádí hodnoticí protokol. Formální část má **22 bodů** a obsahuje
položky, které jsou přímo kontrolovatelné:

| Položka | Body | Kritérium | Stav |
| :--- | --: | :--- | :--- |
| Dodržení jednotného stylu | 5 | Jednotný font, velikost, řádkování, číslování, okraje | ✅ |
| Členění práce do kapitol | 1 | Správné číslování, správné úrovně nadpisů | ✅ |
| Správné odkazování v textu | 5 | Jednotný způsob, soulad s pravidly, odkazy za převzatými myšlenkami | ✅ číselné, středníky |
| Seznam zdrojů | 3 | Úplný, správně řazený, jednotný styl | ✅ 49 zdrojů, všechny citované |
| Anotace | 2 | Obsažena, přiměřený rozsah, správná struktura | ✅ 176 slov, doporučeno 150–250 (`rules.md` R3) |
| Klíčová slova | 1 | Obsažena, přiměřený počet, správně zvolená | ✅ pět, doporučeno přibližně pět (`rules.md` R4) |
| Obsah | 1 | Kompletní, automaticky generovaný, čísla stran | ✅ |
| **Seznam obrázků, tabulek, …** | 1 | **Je obsažen, je kompletní** | ✅ šest obrázků a jedna tabulka, generováno automaticky (`rules.md` R2) |
| Grafické zpracování | 3 | Jednotný styl v celé práci, estetický dojem | ✅ jeden systém ve všech obrázcích |

Pozor: v hodnoticím protokolu je samostatná položka **Správné odkazování v textu**
(5 bodů) a **Seznam obrázků, tabulek, …** (1 bod). Chybějící odkazy na obrázky
(`rules.md` R1) se do hodnocení promítají právě do první z nich — odkaz v textu
patří k odkazování, a chybějící odkaz je formální nedostatek.

Obsahová část hodnotí mimo jiné **Cíl práce** (5 bodů — „je ověřitelný, dosažitelný,
dostatečně konkrétní?"), **Úvod** (3), **Teoretickou část** (5 — „vysvětluje
užívané pojmy? představuje už známé o tématu?") a **metody** (bodově nejvýše —
„je popsána tak, že podle ní lze výzkum opakovat?").

## 5. Plagiát (kap. 5.3)

Průvodce považuje za plagiát i nepopsanou převzatou součást textu: „Pokud jsou
součásti textu nebo prezentace převzaty z nějakého zdroje, vždy musí být tento
zdroj uveden a správně citován, v opačném případě se jedná o plagiát."

V této práci jsou převzaté: tabulka podílů uživatelů (Obr. 1, citováno
@gradually-ai-usage-2026), schéma vektorových vztahů (Obr. 2, @mikolov2013linguistic)
a popis ReAct smyčky (@yao2022). Vlastní kresby — Obr. 4 a 5, Výpis 1 — jsou
odvozené z vlastního systému a citují revizi, ze které vycházejí.
