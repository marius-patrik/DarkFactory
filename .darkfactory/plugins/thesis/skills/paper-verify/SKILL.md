---
name: paper-verify
description: Use when declaring a change to the thesis finished, when checking citations, corrections, layout or the build, or when asked whether the paper is in order.
license: MIT
---

# Ověření práce

Sada publikace (`bun ../scripts/paper/publication.ts`) kontroluje **strukturu PDF**, ne obsah.
Prošla v práci, která obsahovala čtyři nepravdivá tvrzení o kódu. Ověření obsahu je tady a musí se
dělat ručně.

## Návratový kód příkazu, ne příkazu před trubkou

Toto bylo oznámeno jako „sestavení prošlo“, zatímco sestavení **selhalo**, protože `$?` patřilo
`head`:

```sh
# špatně: $? je návratový kód head
typst compile main.typ out.pdf | head -3; echo "exit=$?"

# dobře
typst compile main.typ out.pdf; echo "exit=$?"
```

Totéž platí pro `&&`, `|`, `$(...)` a libovolnou substituci. Když píšeš „hotovo“ po příkazu,
vezmi kód z toho příkazu.

## Co ověřit

**Sestavení.** `cd paper && bun run check` — sestaví typst a spustí kontrolu struktury. Toto
potvrzuje, že se dá sestavit. Nic jiného.

**Čtyři opravená tvrzení.** Jsou v textu v českém znění, protože sada publikace nezná obsah.
Vyhledávej na **fráze, které se nezmění**, ne na celou větu:

```sh
grep -rn 'nejvýše třemi iteracemi' pages/
grep -rn 'Po čisté review ještě' pages/
grep -rn 'seznamem dvou pevně zapsaných účtů' pages/
grep -rn 'pouze jednou a po opravě už ne' pages/
```

Nulový počet nalezených znamená, že tvrzení v textu není. To je selhání, ne informace k závěru.

**Pokrytí citací.** Každá položka `components/bib/references.bib` musí být citovaná. Počítání
bylo třikrát špatně, takže jsou známé všechny pasti:

- Nezaměňuj reference na popisky (`@terminologie`, `@fig-react-loop`) s bibliografickými klíči.
  Obě začínají na `@`.
- Tokenizuj s **maximální žravostí**. Náhled, který odmítne citaci následující tečkou, odmítne
  většinu citací.
- `findall` vrací celou shodu **včetně `@`**, takže průsečík musí odříznout.

**Sazba.** Měř ji, neodhaduj. Školní pravidlo pro mezeru pod odstavcem a jeho odchylka jsou
v `school-rules`, ale jak ji změřit je tady:

```sh
# jen reportuje
bun .darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../THESIS_CASE_STUDY.pdf

# nebo tvrdí: skončí 1, když nesouhlasí (0.5pt tolerance)
bun .darkfactory/plugins/thesis/scripts/measure-paragraph-gap.ts ../THESIS_CASE_STUDY.pdf --want 8
```

`typst-safe-editing` vysvětluje, proč je číslo ve stylu jiné než mezera na stránce.

**Struktura před úpravou.** Při strukturální úpravě, která posouvá kapitolu, vytáhni text z PDF
před a po a porovnej. Tak se odhalil ztracený odstavec, který se jinak neprojevil.

## Co tato dovednost neověřuje

- **Že je tvrzení pravdivé.** Tvrzení o kódu se ověřuje proti `d576ec8f` a ručně, ne skriptem.
- **Že je text dobrý.** Na to je `no-slop-review` a `czech-academic-prose`.
- **Že je dodržena škola.** Na to je `school-rules`, a ta má část, kterou automatika neověří —
  zda součást včetně popisku leží na jedné straně, lze zjistit jen pohledem do PDF.
- **Sada publikace není autorita pro obsah a ty nejsi autorita pro pravdivost.** Když něco
  nesouhlasí, napiš to, neopravuj to odhadem.
