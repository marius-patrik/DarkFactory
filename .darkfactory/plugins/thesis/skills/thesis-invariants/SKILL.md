---
name: thesis-invariants
description: Use when editing any part of the thesis, when a claim about the pipeline or the methodology is at stake, or when asked whether something in the paper may be changed.
license: MIT
---

# Invarianty práce

Tato dovednost obsahuje věci, které se **nemění**. Jiná dovednost (`school-rules`) obsahuje pravidla
školy, která se mění jen se souhlasem vedoucího. Tady jde o tvrzení o kódu, o kterých autor
ví, že byla vyvrácena, a o rozhodnutí, která byla přijata.

Když cokoliv z tohoto seznamu brání úpravě, **zastav se a napiš to autorovi**. Neopravuj to
sám, neinterpretuj to jinak, nevynechej to. Tvrzení, která byla jednou vyvrácena, byla vyvrácena
proto, že se na ni dalo spoléhat.

## Tento seznam se stará. Když je položka zastaralá, je chyba v seznamu

Invarianty jsou tvrzení **o kódu a o přijatých rozhodnutích**, a obojí se mění. Tento soubor
proto není zdroj pravdy o tom, co práce právě tvrdí — je to pravda o tom, co **bylo** třeba
neprozřít. Konkrétní stav práce patří do jejího stavového souboru, ne sem.

Před použitím každé položky ověř, že ještě platí:

1. **Je tvrzení o kódu stále v kódu?** Otevři zdroj. Tvrzení, které už neplatí, je horší než
   žádné, protože vypadá ověřené.
2. **Je výrok, na který se položka vztahuje, ještě v práci?** Řada položek cituje větu z textu.
   Když věta zmizela, zruš se i položka — neopravuj ji dosazováním jiného místa.
3. **Je struktura ta, jaká je teď?** Struktura práce se mění. Položka o kapitole, která už
   neexistuje, je zastaralá.
4. **Sem nepíš revizi, commit, řádek ani název souboru.** Dovednost je přenosná a má přežít
   repozitář. Co platí dnes, patří do stavového souboru práce.

Když položka neplatí: **zapiš nález do stavového souboru práce a položku odstraň.** Nevyhazuj ji
tiše a neopravuj domýšlením. Nález musí být dohledatelný, jinak se chyba vrátí.

## Ověřuj proti revizi, kterou práce popisuje

Praktická část může popisovat **jedinou** revizi, zpravidla jinou než HEAD. Citace na ni je
v textu vidět; najdeš ji mezi citacemi, které odkazují na vlastní kód.

**Nic nepřepisuj z HEAD.** Tvrzení o kódu se ověřují proti revizi, kterou práce popisuje. Novější
revize mívá přesměrovanou cestu, takže kód v HEAD je mrtvý a čtení z HEAD dává nesprávný závěr.
`git log` na pořadí, revize na obsah.

## Opravené chyby, jejichž vzor se opakuje

Každou z nich byla práce dřív napsaná špatně. Konkrétní znění je v jejím stavovém souboru; tady
zůstává **vzor chyby**, aby se příště nerepakovala. Před použitím ověř podle pravidla nahoře, jestli
se vztahují k současnému textu.

**1. `Blocked` znamená jednu věc, ne jinou.** Když práce popisuje, co blokuje běh, dej pozor na
počet iterací: počet bývá v kódu jiný, než byl napsán, a smyčka může skončit bez jakéhokoli
verdiktu a bez komentáře — pak je jediným blokátorem to, co je vyčerpané, a ne to, že se něco
opakovalo. **Počet iterací se uvádí jen tehdy, když je ověřený v kódu, a ne v popisku obrázku,
který ho tvrdí bez dokladu.**

**2. Pořadí dvou kontrol.** Když běh nejprve ověří jednu věc a pak druhou, nesmí se to v textu
obrátit. Pozor na formulaci „ještě proběhne", která zřejmě popisuje pořadí, ale nepřesně.

**3. Seznam účtů, který vypadá na dva a je jeden.** Množina v kódu mívá podobu
`{a.lower(), "b"}`, kde `a` zrovna nabývá hodnotu `b` — pak je v ní **jedno** jméno. Seznam
účtů v práci musí odpovídat tomu, co kód po deduplikaci obsahuje. Když je tvrzení „neověřuje se
autor issue ani úroveň oprávnění", musí být pravdivé: opisuje to, co kód **ne**kontroluje.

**4. Opakovatelná kontrola není totéž co překážka.** Když testy běží a neprojdou, ale běh
pokračuje, je to věc, kterou je třeba napsat — a je to věc, kterou je třeba z textu **vyříadit**,
má-li patřit jen jednou. Obojí je pravda; chybou je napsat ji dvakrát nebo ji vynechat.

**5. Diagram není zdroj tvrzení.** Popisek obrázku a poznámka uvnitř SVG tvrdí věci, které nikdo
neověřil. Diagram může tvrdit opak toho, co dělá kód. Když je v rozporu, rozhoduje kód.

## Odkazy a křížové reference

- **V textu nesmí být žádné zapsané číslo stránky, kapitoly, obrázku ani tabulky.** Všechny
  reference jsou symbolické (`@label`). Vyplácí se to: odebrání stránky nikdy nic nerozbilo.
- Každá očíslovaná součást musí mít odkaz v textu, co nejblíže prvnímu uvedení.
- Seznam součástí textu je generovaný a musí být úplný. Filtruje obrázky, tabulky **a** výpisy
  kódu — klauzule `.or(kind: raw)` existuje proto, že `Výpis 1` ze seznamu tiše chyběl.

## Bibliografie

- **Každá položka seznamu zdrojů musí být citovaná.** Neexistující výjimka; nepřebytečné zdroje se
  odstraňují na konci, ne tichým vypuštěním.
- Způsob citace je v celé práci jeden, určuje ho vedoucí: číselné odkazy podle ISO 690, ve stylu
  `gjkt-iso690-numeric-cs.csl`, pořadí podle první citace, jedno stabilní číslo na dokument.
- Šablona CSL **ticho vypouští pole `note`**, takže poznámka v bibliografii nevypíše. Provenience
  proto musí žít v textu a v popiscích, ne v seznamu zdrojů.
- Nic nevymýšlet: žádné zdroje, fakta, snímky obrazovky ani citáty. Co nebylo přečteno první rukou,
  se necituje.

## Co tato dovednost neřeší

Nevědí, jak sázba odpovídá školním pravidlům — to je `school-rules`. Neví, jak bezpečně upravovat
Typst — to je `typst-safe-editing`. A neprohlašuje, že je dostatečná: jakmile narazíš na tvrzení,
které tu není a které odporuje kódu, **neopravuj ho podle domněnky**. Zjisti, kdo ho tam dal,
a ptej se.
