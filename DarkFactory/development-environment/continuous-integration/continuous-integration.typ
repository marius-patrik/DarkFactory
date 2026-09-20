#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "continuous-integration",
    proper: translation(cs: "Průběžná integrace", en: "Continuous Integration"),
    industry: translation(cs: "CI", en: "CI"),
    citation: bib.humble2010,
    source: bib.humble2010,
)

#let item = concept(
  key: "continuous_integration",
  term: terminology,
  definition: terms => [
Průběžná integrace (CI) je vývojová praxe, při níž se změny často integrují a automaticky ověřují sestavením, testy a dalšími kontrolami.
  ],
  description: terms => [
#unconfirmed[
Samotný jazykový model kód pouze generuje na základě statistických závislostí v trénovacích datech; nemá schopnost vnitřně ověřit, zda je vytvořený program syntakticky bezchybný a funkčně správný. Nezastupitelnou roli objektivního arbitra správnosti proto plní kontinuální integrace (CI) @humble2010.

#diff[
V rámci platformy GitHub zajišťuje kontinuální integraci automatizační platforma #term(terms.github_actions, language: "en", marker: false, linked: false, emphasized: false):
- Izolované běhové prostředí (#term(terms.container, language: "en", marker: false, linked: false, emphasized: false)): Workflow běží v deklarovaném runner prostředí se stanovenými nástroji a závislostmi, čímž se omezuje závislost na lokálním stavu počítače vývojáře.
- Automatická exekuce: Integrační pipeline se automaticky spouští při každém pushi do pracovní větve i při otevření pull requestu.
- Deterministická zpětná vazba pro agenta: Pokud překlad nebo testy selžou, chybový protokol z terminálu je předán zpět do kontextu agenta, který na jeho základě provede informovanou opravu kódu.
][
Konkrétní automatizační platformu popisuje #term(terms.github_actions), izolaci běhu #term(terms.container) a problematiku nedeterministických selhání #term(terms.flaky_test). Koncept CI zde zůstává zaměřen na integrační kontrakt a strojově ověřitelnou zpětnou vazbu.
]
]

#diff[
#critique[
  Nestálost testů (Flaky Tests) v integračních bězích:
  Spoléhání se na automatické testy v CI naráží na problém nestálých testů (_flaky tests_), které občas selžou kvůli časování, síťové odezvě či asynchronním stavům, aniž by kód obsahoval chybu. Pokud agent narazí na takto náhodně selhávající test, může začít nesmyslně upravovat správný kód ve snaze chybu odstranit. CI pipeline proto musí nestálé testy minimalizovat nebo umožnit automatické opakování selhaného běhu v čistém prostředí.
]
][
Riziko nestálých testů je vyčleněno do samostatného konceptu #term(terms.flaky_test).
]
  ],
  summary: terms => [
V agentním vývoji CI poskytuje strojově ověřitelnou zpětnou vazbu, která odděluje generování změny od jejího objektivního ověření.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "version_control"),),
)