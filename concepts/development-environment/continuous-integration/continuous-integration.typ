#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../schema.typ": concept

#let terminology = define-term(
    id: "continuous-integration",
    proper: translation(cs: "Průběžná integrace", en: "Continuous Integration"),
    industry: translation(cs: "CI", en: "CI"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Vývojová praxe, při níž se změny často integrují a automaticky ověřují sestavením, testy a dalšími kontrolami, aby se integrační chyby odhalily co nejdříve.",
    explanation_en: "A development practice in which changes are integrated frequently and automatically verified by builds, tests, and other checks so integration failures are detected early.",
    citation: bib.humble2010,
    source: bib.humble2010,
)

#let item = concept(
  key: "continuous_integration",
  term: terminology,
  theory_enabled: true,
  theory_intro: terms => [
#unconfirmed[
Samotný jazykový model kód pouze generuje na základě statistických závislostí v trénovacích datech; nemá schopnost vnitřně ověřit, zda je vytvořený program syntakticky bezchybný a funkčně správný. Nezastupitelnou roli objektivního arbitra správnosti proto plní kontinuální integrace (CI) @humble2010.

V rámci platformy GitHub zajišťuje kontinuální integraci automatizační platforma #term(terms.github_actions, language: "en", marker: false, linked: false, emphasized: false):
- Izolované běhové prostředí (#term(terms.container, language: "en", marker: false, linked: false, emphasized: false)): Workflow běží v deklarovaném runner prostředí se stanovenými nástroji a závislostmi, čímž se omezuje závislost na lokálním stavu počítače vývojáře.
- Automatická exekuce: Integrační pipeline se automaticky spouští při každém pushi do pracovní větve i při otevření pull requestu.
- Deterministická zpětná vazba pro agenta: Pokud překlad nebo testy selžou, chybový protokol z terminálu je předán zpět do kontextu agenta, který na jeho základě provede informovanou opravu kódu.
]

#critique[
  Nestálost testů (Flaky Tests) v integračních bězích:
  Spoléhání se na automatické testy v CI naráží na problém nestálých testů (_flaky tests_), které občas selžou kvůli časování, síťové odezvě či asynchronním stavům, aniž by kód obsahoval chybu. Pokud agent narazí na takto náhodně selhávající test, může začít nesmyslně upravovat správný kód ve snaze chybu odstranit. CI pipeline proto musí nestálé testy minimalizovat nebo umožnit automatické opakování selhaného běhu v čistém prostředí.
]
  ],
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "version_control"),)
)