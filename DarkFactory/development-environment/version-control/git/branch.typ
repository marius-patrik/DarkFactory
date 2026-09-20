#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "branch",
    proper: translation(cs: "Větev repozitáře", en: "Repository Branch"),
    industry: translation(cs: "Branch", en: "Branch"),
    citation: bib.chacon2014,
    source: bib.chacon2014,
)

#let item = concept(
  key: "branch",
  term: terminology,
  definition: terms => [
Větev je pojmenovaná vývojová linie v systému správy verzí, která umožňuje provádět změny odděleně od jiné linie historie a později je porovnat nebo sloučit.
  ],
  description: terms => [
#unconfirmed[
Základním bezpečnostním pravidlem při zapojení autonomních agentů do vývoje je striktní izolace rozpracovaného kódu. Stabilní kód v hlavní větvi (`main`) nesmí být nikdy přímo vystaven experimentům a chybám modelu. Agent proto veškeré úpravy provádí ve vyhrazených pracovních větvích odbočených ze základní linie projektu.

Tento princip přináší následující výhody:
- #diff[Ochrana produkční větve][Ochrana produkční větve @chacon2014]: Hlavní větev (`main`) reprezentuje stabilní, otestovaný stav připravený k nasazení. Přímé zapisování do této větve je zakázáno jak lidským vývojářům, tak autonomním agentům.
- Dedikovaná větev pro každý úkol: Agent pro každé zadání dynamicky vytvoří novou samostatnou větev (např. `task/123-oprava-parseru` či `agent/feature-auth`).
- Izolace chyb a mezistavů: Případné syntaktické chyby, dočasné nefunkční stavy ani neúspěšné hypotézy neovlivňují stabilitu hlavní větve ani práci ostatních vývojářů v týmu.
- Bezpečné zahození nezdařených běhů: Pokud se agent dostane do slepé uličky nebo vyčerpá přidělený rozpočet kroků, celou větev lze smazat jedním příkazem bez jakýchkoliv následků pro zbytek repozitáře.

Pokud se hlavní větev během práce agenta posune dopředu v důsledku jiné aktivity v repozitáři, pracovní větev agenta se musí před dokončením zaktualizovat (`git rebase` nebo `git merge`), aby byla zajištěna bezkonfliktní integrace.
]
  ],
  summary: terms => [
Samostatná pracovní větev izoluje mezistavy a chyby agentního běhu od stabilní hlavní linie a umožňuje celý neúspěšný pokus bezpečně zahodit.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
)