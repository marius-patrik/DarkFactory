# Školní pravidla — závazná část

Vytvořeno pro práci *AI asistované softwarové inženýrství* (DarkFactory).
Zdroj: `docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`, školní *Průvodce tvorbou
odborné práce* (Gymnázium J. K. Tyla). Obnoveno z archivovaného repozitáře
`OdbornaPrace-mono` (viz `guide.md` pro odkaz na původ).

Tento soubor obsahuje **jen závazná pravidla** — to, co lze zkontrolovat a co se
promítá do hodnocení. Doporučující část průvodce je v `guide.md`.

Formulace jsou citovány doslova, aby je bylo možné ověřit proti originálu.
Čísla v závorce odkazují na kapitolu průvodce.

---

## 1. Sazba textu (kap. 4)

| Pravidlo | Znění | Stav práce |
| :--- | :--- | :--- |
| Okraje | „Okraje stránky jsou nastavené na 2,5 cm, u hřbetu navíc 0,5 cm (tedy 3 cm celkem)." | ✅ `styles/page.typ` |
| Patkový font | „V celé práci se používá jednotný patkový font, standardně černá barva." | ✅ Caladea |
| Velikost a zarovnání | „Hlavní text je zarovnaný do bloku a má velikost 12 bodů." | ✅ `styles/body.typ` |
| Řádkování | „Řádkování textu je 1,5 řádku" | ✅ `leading: 1.5 × 0.65em` |
| Mezera pod odstavcem | „mezera pod odstavcem má velikost 8 bodů" | ✅ `spacing: 8pt` |
| Odsazení | „První řádek odstavce se zleva zvlášť neodsazuje." | ✅ `first-line-indent: 0pt` |

> ⚠️ Průvodce výslovně upozorňuje, že 12 b a **patkový** font jsou závazné a že
> mnoho odevzdaných prací používá 11 b Calibri, což pravidlům neodpovídá.

## 2. Kapitoly a nadpisy (kap. 4)

- „Kapitoly i podkapitoly se číslují vzestupně. **Za poslední číslicí čísla kapitoly
  se nepíše tečka**" — tedy `2`, `2.1`, nikoli `2.`.
  ✅ `styles/headings.typ` → `numbering: "1.1"`
- Velikosti nadpisů: **16 / 14 / 12 b, vždy tučně**.
  ✅ `styles/headings.typ`
- „Mezera před nadpisem je velikost písma nadpisu plus 5 bodů (následuje-li po
  odstavci nadpis na téže stránce, mezera před nadpisem musí být větší než mezera
  pod nadpisem, aby bylo vizuálně zřejmé, ke které kapitole text patří)."
  ✅ `above: 21 / 19 / 17pt` proti `below: 10 / 9 / 8pt`

## 3. Číslování stran a obsah (kap. 4)

- „Čísla stránek se uvádí v zápatí, jsou zarovnaná na střed, napsaná stejným fontem
  jako text práce, velikostí 11 bodů."
  ✅ `styles/footer.typ`
- „Čísla stránek se uvádějí **od úvodu**, za stranu 1 se považuje titulní strana
  práce. Úvod tedy není na straně 1."
  ✅ `pages/index.typ` — footer se zapíná až za obsahem, čítač se nuluje od titulní
- „Součástí práce je automaticky vygenerovaný obsah obsahující čísla a názvy
  kapitol a podkapitol a čísla stran, na kterých tyto kapitoly a podkapitoly
  začínají." ✅ `pages/03-outline.typ`, `depth: 3`

## 4. Součásti textu (kap. 4 a 6)

Pravidla, která se nejčastěji porušují:

- **Odkaz v textu je povinný.** „Na každou součást odborného textu, která je v
  textu uvedena, musí být v textu odkaz, aby čtenář pochopil, k čemu součást
  textu slouží a jaký je její význam." (kap. 6)
- **Součást včetně popisku musí být celá na jedné straně.** „Podmínkou ale je,
  aby součást včetně jejího popisu byla celá na stejné straně." (kap. 6)
- **Umístění:** „co nejblíže za první odkaz na tuto součást, zpravidla na
  samostatný řádek." (kap. 6)
- **Převzaté součásti se citují v popisku.** „Odkaz na zdroj se uvádí v
  popisku součásti, citace se řadí do seznamu zdrojů na konci práce. … v opačném
  případě se jedná o plagiát." (kap. 6)
- **Seznam součástí je automatický a musí být kompletní**, včetně čísel stran
  (kap. 4). Hodnotí se jako „Je obsažen, je kompletní".
- **Popisek obrázku:** stejný font, o dva body menší (10 b), **vždy pod obrázkem**,
  zarovnaný vlevo, průběžné číslování (kap. 6.2.1).
- **Popisek tabulky:** stejný font, 10 b, vlevo; při pokračování na další straně
  se záhlaví opakuje a popisek ne (kap. 6.1.1).
- **Kód** se „graficky oddělí, např. ohraničí rámečkem" (kap. 6.1.3).
- **Text uvnitř grafu** se sází bezpatkovým písmem (kap. 6.2.2). Týká se `Graf`,
  nikoli schématu `Obrázek` — diagrams v této práci jsou obrázky.
- **Přílohy:** velké součásti se přesunou do přílohy; přílohy se číslují, odkazuje
  se na ně v textu a musí mít vlastní seznam (kap. 4).

## 5. Zdroje a citace (kap. 5)

- **Jedna metoda v celé práci.** „V celé práci se používá jeden způsob citací.
  Způsob citací určuje vedoucí práce." — tato práce používá **číselné odkazy**,
  tedy ISO 690 numeric, CSL `gjkt-iso690-numeric-cs.csl`.
- **Pořadí podle první citace.** „Číslem v hranatých závorkách, kulatých závorkách
  nebo horním indexu odkazujeme v textu na citované zdroje **v pořadí, v jakém jsou
  citovány poprvé**. Dokument, na který se odkazuje vícekrát, má stále stejné
  číslo."
- **Více zdrojů v jedné závorce, oddělené středníkem:** `[4; 12]` — nikoli `[4, 12]`.
  ✅ CSL šablona tuto podobu používá.
- **Seznam zdrojů** vzestupně podle čísla, čísla bez závorek, číslovaný seznam
  s odsazením.
- **Zdroj musí být dohledatelný.** U internetové stránky se vyžaduje „název stránky,
  URL, rok vytvoření, datum změny, autor (jsou-li údaje známy), datum citování".
  ✅ položky `@online` v `components/bib/references.bib` mají `urldate`.

## 6. Anotace a klíčová slova (kap. 2.1)

- **Anotace 150–250 slov**, psaná minulým nebo přítomným časem, jako popis toho, co
  bylo uděláno, nikoli jako hodnocení. Struktura odpovídá struktuře práce: problém →
  metody → výsledky → případně doporučení.
- **Klíčová slova: přibližně pět pojmů**, ani příliš dlouhá, ani krátká; neměla by
  obsahovat stejné pojmy jako název práce.

---

## Aktuální stav — co je nutné dořešit

Následující body vyplývají z kontrolního průchodu těmito pravidly. Každý je
očíslován, aby se na ně dalo odkazovat.

| # | Problém | Pravidlo | Kde |
| :-- | :--- | :--- | :--- |
| R1 | Čtyři ze šesti očíslovaných součástí **nemají odkaz v textě**: `fig-gradually-usage`, `fig-react-loop`, `fig-darkfactory-architecture`, `fig-darkfactory-pipeline` | kap. 6 — odkaz povinný | `pages/10-intro.typ`, `22-theory-harness.typ`, `32-practical-architecture.typ` |
| R2 | **Seznam součástí textu není kompletní** — obsahuje jen obrázky a tabulky, ale `Výpis 1` (rozhraní harnessů) je také číslovaná součást | kap. 4 — automatický seznam včetně čísel stran; hodnotí se „je kompletní" | `pages/91-figure-list.typ` |
| R3 | **Anotace má 128 slov**, doporučený rozsah je 150–250 | kap. 2.1 | `components/metadata.typ` |
| R4 | **Šest klíčových slov**, průvodce uvádí přibližně pět | kap. 2.1 | `pages/02-annotation.typ` |

R1 a R2 jsou hodnotitelné položky formální části, R3 a R4 jsou hodnotitelné
samostatně. Viz `guide.md`, oddíl *Hodnocení*, kde jsou uvedeny váhy.
