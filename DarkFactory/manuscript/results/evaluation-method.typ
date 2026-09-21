#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "evaluation_method_body",
  title: [Metoda ověření],
  definition: terms => [
Evaluace odděluje tři druhy důkazů: strukturu a kontrakty implementace, automatické testy jednotlivých mechanismů a integrační důkazy z CI nad konkrétním commitem.
  ],
  description: terms => [
Jako reprodukovatelný referenční bod je použit commit `e9c10221b40589512d262a0edb95f709b923150c` z 21. září 2026. #cite(bib.darkfactory_e9c10221) Nad tímto commitem byl vyhodnocen CI run `35616745304`, jeho jednotlivé joby a jejich logy. #cite(bib.darkfactory_ci_35616745304)

Architektonická tvrzení jsou kontrolována proti aktuálním balíčkovým hranicím, protokolovým kontraktům a testovanému zdrojovému kódu. Funkční tvrzení jsou přijata pouze tehdy, pokud pro ně existuje konkrétní test nebo pozorovaný workflow výsledek. Existence deklarované funkce v PRD sama o sobě není považována za důkaz úspěšného provedení.
  ],
)
