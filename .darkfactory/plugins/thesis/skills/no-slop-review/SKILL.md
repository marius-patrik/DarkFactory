---
name: no-slop-review
description: Use when reviewing a draft or a section for filler, padding, hedging, repetition or empty scaffolding, and when deciding which findings are real enough to act on.
license: MIT
---

# Revize bez vody

Cílem není najít co nejvíce chyb. Cílem je **opravit to, co je prokazatelně vadné, a nechat být
to, co jenom voní jako vada**. Voda má tu vlastnost, že když na ni zaměříš bez důkazu, začneš
přepisovat dobře napsané věty do špatně napsaných.

## Pravidlo důkazu

Každé pravidlo má důkaz, který opravňuje jednat. Bez důkazu je pravidlo jen názor. Nejlepší
existující implementace tohoto principu třídy pravidel — `blader/humanizer` — čísluje 26 znaků
podle toho, **kolik důkazu ospravedlňuje na něj reagovat**, a většina jeho forků ten rozdíl zahodila.
Zachovej ho.

| Důkaz | Co znamená |
| :--- | :--- |
| **Vidět to v textu** | Důkaz je. Dvě sousední věty tvrdí totéž jinými slovy: opravit. |
| **Pravidlo bez dokladu** | Předpoklad. Neuvádět jako nález. |
| **Autor to tak chtěl** | Nech to být. |

## Rozlišuj kořen příčiny

Sloveso *zdůrazňovat* je někdy přebytek a někdy je věta jen špatně napsaná, ne nadbytečná. Rozdíl
je poznat jen podle toho, **co autor zamýšlel říct**. Jestliže autor chtěl zdůraznit, chybí
zdůraznění. Jestliže chtěl vysvětlit, je *zdůrazňovat* voda.

Toto je jediný způsob, jak revize nezničí význam, a zároveň jediný způsob, jak nezůstane prázdná.
Když nepoznáš, co bylo míněno, **zeptej se**. Nehádej.

## Které čtení je správné

Voda se pozná podle čtenáře. Text, který vypadá jako výplň přehrávaný před odborným čtenářem,
může být přesně to, co potřebuje začínající čtenář, kterého práce oslovuje. Než něco označíš za
vodu, řekni, **pro koho** je to voda. Tato práce je pro někoho, kdo této problematice nerozumí;
to není totéž jako text pro specialistu.

## Co se nekontroluje

Ze seznamu známých pravidel pro odstranění vody vyřaď tohle. Je to část, kterou skutečné
implementace odlišují:

- **Nepředlávej větu, která něco tvrdí, jen proto, že zní sebevědomě.** Nejistota navázaná na
  důkaz je povinná, ne chyba. Věda je definována jako nejistota navázaná na důkaz.
- **Nemaž sloveso, protože formulace je pasivní.** Pasivní sloveso bývá správné, když je důležité,
  kdo jedná.
- **Nedělej z grantového návrhu totéž co z odborného článku.** Část pravidel pro návrhy je
  opačná a použije se jinde.
- **Nezakazuj interpunkci absolutně.** Existuje pravidlo „nikdy em-dash“, které se v této práci
  neplatí; čárka před „nebo“ v nepřímé otázce je správná.
- **Nepřepisuj, co autor nezrušil.** Otec zmořenin podle Freuda je krásná formulace; věda, která
  o něm mluví, je formulace.

## Podagent jako zdroj nálezů, ne jako autorita

Korektorský podagent na této práci vrátil **89 nálezů, z nichž asi 20 bylo skutečných**. Devětadvadesát
procent hluchu. Podobně převzatá čtení parafrázovala nosnou citaci a vypustila větu, která nesla
poctivost výkladu.

Proto: **každý nález ověř v souboru, než na něj zakládáš změnu.** Podlej je dobrý na to, aby
našel kandidáty, nikoli na to, aby o nich rozhodl. Oba podagenty dostali v tomto průchodu
protisměr: jeden dostal „najdi chyby“, druhý „najdi jen to, co je objektivně vadné, a napiš, co
jsi přesně zkontroloval“.

## Formát nálezu

Nález, který neřekne, **co přesně je špatně**, není nález. Piš:

> **Co:** přesná citace z textu.
> **Proč:** co to porušuje, podle pravidla.
> **Důkaz:** proč je to porušení vidět, ne jen možné.
> **Návrh:** konkrétní přeformulování, ne „zjednodušit“.

Nález, u kterého chybí důkaz, napiš jako **otázku** a nech ho autorovi. Otázka je levná a
zbytečná oprava je drahá.
