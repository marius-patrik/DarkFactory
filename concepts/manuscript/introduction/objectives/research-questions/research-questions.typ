#import "../../../../../templates/common.typ": define-term, translation, unconfirmed, critique
#import "../../../../schema.typ": concept

#let terminology = define-term(
  id: "research-questions",
  proper: translation(cs: "Výzkumné otázky", en: "Research Questions"),
  keyword: false,
)

#let item = concept(
  key: "research_questions",
  term: terminology,
  definition: terms => [
#unconfirmed[
- VO1 (Míra automatizace a role člověka): Lze vývojový proces od zadání požadavku (GitHub Issue) po pull request strukturovat tak, aby role vývojáře spočívala výhradně v architektonickém dozoru a schvalování záměru (Human Gate), bez nutnosti ručního psaní rutinního kódu?
- VO2 (Řízení divergence a spolehlivost smyčky): Jakými architektonickými mechanismy lze v harnessu spolehlivě zabránit patologiím modelu (perseveraci, oscilaci a zacyklení v ReAct smyčce)?
- VO3 (Integrita paměti a eliminace sémantického posunu): Jak spravovat kontextové okno agenta při komplexních úlohách, aby nedocházelo k degradaci pozornosti (Context Rot) a ztrátě architektonických invariantů při kompresi?
]
  ],
  document_enabled: true,
  document_after: terms => [
#critique[
  Oponentura k výzkumným otázkám:
  Otázka VO1 je formulována binárně („Lze vývojový proces strukturovat...“), což svádí k tautologické odpovědi. Rigorózní oponent bude žádat empirické vymezení: Jaké procento rutinních úloh (např. oprava chyby se selhávajícím testem vs. komplexní refaktoring) harness reálně odbaví bez ručního zásahu do kódu? Doporučujeme otázku v obhajobě doplnit o kritérium mezní složitosti úkolu a míry redukce kognitivní zátěže člověka.
]
  ],
  relations: ((type: "dependency", target: "subgoals"),),
)
