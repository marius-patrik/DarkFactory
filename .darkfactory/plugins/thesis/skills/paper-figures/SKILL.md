---
name: paper-figures
description: Use when adding, resizing, captioning or placing a figure, diagram or graph, or when a sentence and a figure disagree about what they show.
license: MIT
---

# Obrázky

Obrázek je tvrzení. Když popisek nebo věta říkají něco jiného, než obrázek ukazuje, je chybný
obrázek, popisek i věta — a nejhorší je, že vypadá všechno v pořádku.

## Obrázek musí ilustrovat tvrzení, u kterého stojí

ReActův obrázek ukazoval prostou smyčku jednání a pozorování, která odporovala textu přímo nad
ním, a musel se překreslit. Sekce, která mluvila o „obou bránách“, když posloupnost byla jiná,
je stejná třída chyby. **Přečti si větu nad obrázkem a pod obrázkem a ověř, že obrázek ilustruje
právě ji.**

## Provenience musí být pravdivá

Popisek říká, **co obrázek je**, a ne víc:

- dokumentace výrobce je dokumentace výrobce,
- příspěvek komunity je příspěvek komunity a nesmí působit jako oficiální specifikace,
- vlastní schéma je vlastní schéma.

Nepředstírat, že něco bylo vytvořeno, pokud to nebylo. Ve fiktivním příkladu se nepodařilo
vyrobit snímky obrazovky, a místo aby to byla jasná mezera, vznikla neviditelná vymyšlenina
v textu. **Vynechaný důkaz je lepší než vymyšlený.** Šablona CSL `note` nevypíše, takže
provenience musí být v popisku, ne v seznamu zdrojů.

Upřímnost se netýká jen provenance. Obrázek rozhraní je ilustrace rozhraní, **nikoli záznam
pipeline, kterou práce popisuje**. Obrázek, který vypadá jako produkční snímek, ale je kreslený,
porušuje totéž.

## Sazba

- **Všechny obrázky přes celou šířku textu.**
- Legenda **na jednom řádku**, všechny položky na něm.
- U převzatého průzkumu použij barvy **zdroje**, ne vlastní paletu.
- `viewBox` ořezni na skutečný obsah. Bílé okraje zmenšují obrázek, aniž by to šlo vidět.
- Text uvnitř grafu bezpatkovým písmem — to je pravidlo školy pro `Graf`, nikoli pro `Obrázek`;
  schémata v této práci jsou obrázky, a proto se na ně nevztahuje.
- Popisek obrázku: stejný font, **10 bodů**, vlevo, **vždy pod obrázkem**, průběžné číslování.
- **Součást včetně popisku musí být celá na jedné straně.** Toto automatika neověří; je to
  jediné, na co se u obrázků opravdu musí podívat člověk do PDF.

## Umístění

Odkaz v textu co nejblíže prvnímu uvedení, zpravidla na samostatný řádek. Odkaz je povinný pro
každou očíslovanou součást a seznam součástí textu musí být úplný — **včetně výpisů kódu**, které
dříve z něj tiše chyběly.

## Když obrázek nepopisuje to, co tvrdíš

Tři možnosti, a nesmíš vybrat tu špatnou:

1. **Překreslí obrázek**, aby ukazoval to, co tvrdí text.
2. **Přepiš větu**, aby tvrdila to, co ukazuje obrázek. Pokud je věta správná a obrázek je
   chybný, toto je ta možnost.
3. **Neopravuj hloupě.** Zeptej se, jestli je správně tvrzení, které obrázek vyvrací. Tohle se
   stalo: věta o tom, že pozornost zpracovává celý kontext najednou, „really doesn't describe
   attention“. Pak je chybná věta, ne obrázek.
