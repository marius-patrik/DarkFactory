#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
    id: "context-compaction",
    proper: translation(cs: "Kompakce kontextu", en: "Context Compaction"),
    industry: translation(cs: "Compaction", en: "Compaction"),
    explanation_cs: "Proces zmenšení aktivního kontextu, typicky shrnutím, výběrem nebo nahrazením starších částí historie kompaktnější reprezentací tak, aby se běh vešel do kontextového okna.",
    explanation_en: "The process of reducing active context, typically by summarizing, selecting, or replacing older history with a more compact representation so execution remains within the context window.",
    citation: bib.jiang2023llmlingua,
    source: bib.jiang2023llmlingua,
)

#let item = concept(
  key: "compaction",
  term: terminology,
  heading: terms => [Kompakce kontextu a ztrátová komprese],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Správa aktivního kontextu je součástí kontextového inženýrství (#term(terms.context_engineering, language: "en", marker: false, linked: false, emphasized: false)). Při rozsáhlejších úlohách se kontextové okno nevyhnutelně zaplní. V okamžiku, kdy objem historie dosáhne kritické hranice, musí agent harness přistoupit ke kompakci kontextu #diff[(_compaction_)][(_compaction_ @jiang2023llmlingua)] — model je vyzván, aby dosavadní průběh sezení zkrátil do syntetického souhrnu, který nahradí starší část historie.

Tento proces však představuje destruktivní ztrátovou kompresi:
- Ztráta deterministických detailů: Model při rekurzivním zkracování vynechává přesná čísla řádků, signatury privátních funkcí, přesné cesty k souborům a doslovná chybová hlášení kompilátoru.
- Oslabení negativních pravidel: Explicitní zákazy (např. neměnit veřejné rozhraní API) bývají v souhrnu zevšeobecněny nebo zcela vypuštěny.
- Konfirmační zkreslení (_Confirmation Bias_): Model v souhrnu upřednostňuje fakta odpovídající jeho vnitřním statistickým asociacím na úkor netriviálních specifik konkrétního projektu.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "context_window"),)
)