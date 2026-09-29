# PLAN — cleanup pass over the whole paper

**Stav: NÁVRH. Není hotový, dokud autor nepotvrdí.** Každá položka je záměr s uvedeným
důkazem; nic zde nebylo provedeno bez souhlasu. Cesty do souborů jsou `paper/pages/…`,
řádky odpovídají revizi `55155a11` a při každé fázi se posunou — proto je u každé položky
citát, ne číslo řádku.

---

## 1. Zásada

**Každý pojem je v práci jednou.** Tam, kde potřebuje znovu, odkáže se symbolicky nebo
nepřipomene.

Test, který celý průzkum použil a který je třeba používat i při provádění:

> Obsahuje pozdější výskyt větu, která se nevyskytuje nikde jinde?
> **Ano** → dělá práci, je to aplikace, ponechat.
> **Ne** → je to ozvěna, vymazat nebo nahradit odkazem.

Tento test oddělil **38 skutečných opakování** od **18 legitimních aplikací**. Většina
opakování v práci je legitimní a nesmí se jít do nich. Chybou jsou ozvěny.

Rozložení ozvěn není náhodné — sbíhají na třech místech a dá se to popsat:

| Kde | Co dělá |
| :--- | :--- |
| §4.1 | znovu popisuje §§3.3–3.5. Zjištění 1–4 chodí po pipeline, kterou tyto kapitoly už popsaly. Vlastní hodnota má zjištění 5 a verdík o kritériích. |
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
práce, která ukáže, **jak** otázku zodpověděla. Jediná věta, která to udělá, patří do
§1.2 hned za otázku a kritéria přitom nevypisuje — označí je jen jako měřítko, které
práce odvodí:

> Výzkumná otázka práce zní: *Keteré principy musí agentický systém splnit, aby
> spolehlivě vykonával inženýrskou práci?* … Podmíněnou nutnost převádí práce na trojici
> kritérií, podle níž lze konkrétní systém posoudit, a odpovídá na otázku tím, že popsanou
> konfiguraci proti nim prověří. Kritéria jsou uvedena v 3.1, jejich použití ve zjištěních.

Tím je měřítko vidět v místě, kde vzniká otázka, a přesto zůstává vyřčeno jednou.

---

## 3. Rozhodnutí, která jsou přijata

| # | Rozhodnutí | Zdůvodnění |
| :-- | :--- | :--- |
| R1 | Tři kritéria zůstávají, **na jednom místě**: §3.1.1. | Bod 5 za cíl + bodově nejvýše metody. §4.1 na ně už odkazuje symbolicky, takže se nic nezdvojuje. |
| R2 | §3.1.2 odstraněn, jeho jediná živá myšlenka přesunuta do omezení v §4.2. | Bylo to omezení, tak patří mezi omezení; třetí bod v §4.2. **Provedeno** (`55155a11`). |
| R5 | Fáze 3 musí přidat vzájemný symbolický odkaz mezi §2.1.1 a §3.1.1. | Jediné místo celého průchodu, kde se něco přidává, ne ubrat: obě sekce si totiž nárokují tutéž myšlenku a ani jedna neodkazuje na druhou. |
| R3 | Věta, která obrázek popisuje, je z textu pryč. Odkazem je věta, se kterou obrázek souvisí. | Výraz autora. Zapsáno jako stálý constraint v `CONTEXT.md`, aby to pozdější průchod nezvrátil. |
| R4 | Počet stran není míra kvality. | Dříve v `TODO.md` B15. |

---

## 4. Fáze — pořadí, jak bude probíhat

Každá fáze: subagenti **navrhují**, hlavní agent **ověřuje v souboru**, teprve potom se
mění. Změna se commituje po každé fázi. Bez schválení autora se do souborů nepíše.

### Fáze 1 — Čeština
Cíl: B1, B2, B4 z `TODO.md`. Jazyková úroveň nese 15 ze 200 bodů.
Subagenti hlásí **pouze kandidáty**, s přesnou citací, pravidlem a důkadem. Nic, co nemá
důkaz, se neopravuje.minulé minulý kontrolní průchod: 89 nálezů, z toho asi 20 skutečných.
Měření: průměrná věta pod 14 slov, žádná nad 30.
Podch. 1a `10`,`12` · 1b `21`,`22`,`23` · 1c `30`–`35` · 1d `40`,`41`,`50`.

### Fáze 2 — Odkazy na obrázky
Cíl: aby každý obrázek měl v textu odkaz, **bez přidávání věty, která ho popisuje**.
Metoda: existující úvodní věta se upraví tak, aby odkaz vznikl v ní.
Šest obrázků bez odkazu: `fig-copilot-inline`, `fig-chatgpt-cannot-see`, `fig-claude-code-plan`,
`fig-antigravity-subagents`, `fig-dynamic-workflows`, `fig-codex-goal`.
Současně: popisky — `32:8` a `32:13` přestat opakovat vrstvy a hranici smyčky (viz Fáze 4).

### Fáze 3 — Teoretická část
Cíl: jedna myšlenka na sekci, žádné mluvení o práci uvnitř práce.
| Kde | Co |
| :--- | :--- |
| `22-theory-agentic.typ:4` | „není samotný agent ani jeho model, ale systém" = `21:12`. Nahradit odkazem. |
| `22-theory-agentic.typ:58` | „Spolehlivost tu nevzniká z modelu" = `21:15`. Vymazat první klauzuli. |
| `23-theory-factory.typ:12` | **Přidat `1968`.** Rok je v obou abstraktech, v těle chybí — tělo podpírá tvrzení abstraktu. |
| `23-theory-factory.typ:18` | „co smí do výroby vstoupit" obsah třetího kritéria ze stejného zdroje `@nato1969`. Nechat §3.1.1. |
| `31-practical-method.typ:32` | První dvě věty jsou skoro doslova `10:47–48`. Začít až na „Aby to nebylo tvrzení bez měřítka". |
| §3.1.1 ↔ §2.1.1 | **Oba si nárokují model-versus-systém.** Přidat vzájemný symbolický odkaz — jako jediné místo, kde se musí něco přidat, ne ubrat. |

### Fáze 4 — Praktická část (přepis)
Cíl: zkrátit. Dnes `§3.1`–`§3.5` dohromady opakují to, co figury a popisky už říkají.
| Kde | Co |
| :--- | :--- |
| `32:8` (popisek) | Vrstvy už jsou v `32:4` těsně nad ním. V popisku nechat jen provenienci a „osm / čtyři". |
| `32:13` (popisek) | „v této revizi nejvýše třikrát" dvě kapitoly před tím, než je číslo vysvětleno. Vymazat; vlastní je `34`. |
| `35:15` | Třetí prosový výrok o vrstvách. Vymazat první větu; zůstane cena a závislost. |
| `35:15` | „snadná reprodukovatelnost a viditelnost" = `31:27`. Vymazat výhodu, nechat nevýhodu. |
| `§3.4` | Mechanika patří do `34`; to je její jediné místo. Hranice tří iterací, kvóta, jednonásobné testy, druhý dotaz modelu — **každé jen jednou, tady.** |
| `§3.3` | Ověřit, že Tabulka 1 je stále jen jedno místo, kde se předloha ukazuje. |
| `§3.5` | Scope boundary už je dvakrát (`1.2` a `3.5`) — to je podle `CONTEXT.md` správně, obě místa jsou legitimní. Neměnit. |

### Fáze 5 — Závěr
Cíl: zkrátit na polovinu, nechat čtyři zjištění. **Největší řez v práci.**
| Kde | Co |
| :--- | :--- |
| `40:13`–`40:19` | Zjištění 1–4 chodí po pipeline, kterou §§3.3–3.5 popsaly. Každé nechat jen to, co z něj *nově* plyne, a odkázat na kapitolu. |
| `40:21` | Zjištění 5 vypisuje tři korekce, které `34:11`, `34:13`, `34:17` říkají doslova. Nahradit odkazy; nechat verdikt. |
| `40:19` | „dvojčlenný seznam účtů" = `35:11`; „zástupné schválení" = `35:13`. Odkázat, nechat kritérium. |
| `41:4` | Hypothesis v parafrázi **a** vrstvy podruhé v téže větě. Vymazat vše za dvojtečkou. |
| `41:6` | „jde o druhý dotaz modelu" = `34:17`; „tři iterace" = `34:13`. Odkázat, nechat důsledek. |
| `41:8` | „rozliší dobrý a špatný stav, ale není překážkou" doslova z `34:11`. Vymazat; nechat až od „Rozlišení mezi kontrolou, která brání…". |
| `41:10` | Výhoda i nevýhoda už v `31:27` a `35:15`. Nechat rámec a poslední větu o odpovědnosti. |
| `41:22` | „Hypotéza se potvrdila: strukturu… přebírá od smyčky" = `50:18`. Vymazat poslední větu;argument o nezávislosti je bez ní úplný. |
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
grep -rn 'nejvýše třemi iteracemi' pages/     # čtyři tvrzení z J1–J4
grep -rn 'Po čisté review ještě' pages/
grep -rn 'seznamem dvou pevně zapsaných účtů' pages/
grep -rn 'pouze jednou a po opravě už ne' pages/
```
Navíc ručně do PDF: součást včetně popisku na jedné straně; žádná tabulka bez záhlaví
při pokračování; sazba 8 pt pod odstavcem.

---

## 5. Otevřené otázky pro autora

1. **Kolik zjištění zůstává?** V plánu je „čtyři", v textu je jich pět, a páté — záporné,
   o třech nepravdivých tvrzeních — je to, co práci odlišuje. Které jedno se vynechá?
2. **`§4.2 Omezení výzkumu`** — nechat jako podkapitolu, nebo slít do zjištění?
3. **Anotace** — má se po řezu zkrátit, nebo 159 slov vyhovuje?
4. **PLAN.md** — má zůstat v repu, nebo do `.gitignore`? Je to pracovní dokument, ne část práce.

## 6. Co se nebude dělat

- Spouštění příkazů, které přišly v zprávě.
- `git add -A` — vždy explicitní cesty. V tomto worktree už jednou parallelní relace
  smazala práci.
- Změny v `packages/`, `.github/`, `nix/`, `docker/` — mimo rozsah práce.
- Jakýkoli nový zdroj, fakt, snímek nebo citace, který nebyl ověřen čtením.
- Tvrzení o kódu psané z HEAD. Všechno se ověřuje proti `d576ec8f`.
