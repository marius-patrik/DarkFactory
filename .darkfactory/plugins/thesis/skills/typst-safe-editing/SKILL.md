---
name: typst-safe-editing
description: Use when editing, moving or splitting any .typ file, changing a style, or when an edit to the manuscript needs to preserve the rest of the text exactly.
license: MIT
---

# Bezpečná úprava Typstu

Soubor `.typ` je **zabalený do pevného zlomu**. Řádek v souboru není věta, odstavec ani element —
je to řádek širší než obrazovka. Z toho plyne většina pravidel.

## Zlaté pravidlo

**Upravuj přesný řetězec, ne řádek. A ověř, že se našel právě jednou.**

Nahrazení celého řádku zničilo text **třikrát**: jednou zmizely věty o `AGENTS.md`, které tam byly
tři commity, podruhé zmizel celý odstavec místo jedné věty, potřetí to samé při práci s glosářem.
Sestavení po tom prošlo. Chybu odhalil až rozdíl textu z PDF před a po.

```sh
# Ne takto: to je řádek, ne věta.
sed -i '' 's/.*nějaká věta.*//' stranka.typ

# Takto: najdi přesný úsek, ověř počet, nahraď, ověř znovu.
count=$(grep -cF 'přesný úsek textu' stranka.typ)
[ "$count" = 1 ] || { echo "nalezeno $count, čekáno 1"; exit 1; }
```

Po každé strukturální úpravě ověř počty elementů, ne jen to, že se soubor sestavil:
`grep -c '^#figure' stranka.typ` před a po. Duplicitní obrázky vznikly tak, že regulární výraz
hledal `r="4"` ve souboru, kde bylo `r="4.0"`, nic neshodlo a „úprava“ neprovedla vůbec nic.

## Čeho se nikdy nedotýkat

- **Nikdy nerozdělovat `@klíč`, `#emph[…]`, `#strong[…]` ani kód v hranatých závorkách.** Tichá
  ztráta odkazu.
- **`*text*` v Typstu je tučné, ne kurzíva.** Kurzíva je `_text_`. Při převodu z Markdownu to
  obrací význam.
- **Převodník Markdown → Typst nespouštěj na kapitolách.** Konzumoval první odstavec každé
  sekce a zapisoval ``` fences literálně, čímž otevřel raw bloky, které spolkl popisky obrázků.
  Sestavení zůstalo čisté.
- **`set` a `show` v importovaném modulu se tiše neaplikují.** `set par(...)` ve zahrnutém souboru
  neudělá nic; je třeba `#import` a `#show`. Kompilace prošla, 22 stran se změnilo na 16 a vidět
  to bylo až v PDF.
- **CSL šablona `gjkt-iso690-numeric-cs.csl` ticho vypouští pole `note`.** Provenience musí být v
  textu a v popiscích.
- **Justifikace nesmí potlačit mezery mezi větami v češtině.** Někde se mezera mezi větami zrušila
  bez jakékoli chyby.

## Měření sazby

- **`par(spacing:)` je cílová vzdálenost mezi odstavci, ne přírůstek nad řádkováním.** Při
  `leading` 19,6 pt dá `spacing: 12pt` mezeru 0,3 pt, ne 12 pt. Nastavení hodnoty a jeho potvrzení
  bez měření je totéž co tvrdit, že to neplatí.
- **`list(spacing:)` zapsaný ve `body.typ` přepíše `lists.typ`.** Čtyři stejné pokusy, než někdo
  šel hledat pořadí uplatnění.
- **Měř v sestaveném PDF, ne sondou ve zkoušebním souboru.** sonda se vešla na jeden řádek, takže
  změřila jen mezeru mezi položkami, a PDF se s ní neshodovalo.

## Postup

1. Zjisti, co přesně chceš změnit, a **zeptej se, pokud je to formulace textu**, ne sazba.
2. Přečti cílový úsek celý, včetně řádků před a po.
3. Nahraď přesným řetězcem, s kontrolou počtu.
4. Sestav a zkontroluj **návratový kód samotného příkazu**, ne něčeho před trubkou.
5. Vytáhni text z PDF a porovnej s tím před úpravou.

## Co tato dovednost neřeší

Nerozhoduje, zda je nový text pravdivý (`thesis-invariants`), zda odpovídá škole (`school-rules`)
ani zda je v češtině dobře (`czech-academic-prose`). Bezpečná úprava znamená, že zůstane vše
ostatní stejné — ne že je to, co tam je, správné.
