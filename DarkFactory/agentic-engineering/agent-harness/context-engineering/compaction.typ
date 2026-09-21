#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "compaction",
    industry: "Compaction",
  czech: "Kompakce kontextu",
  english: "Context Compaction",
  citation: bib.jiang2023llmlingua,
  source: bib.jiang2023llmlingua,
definition: terms => [
Kompakce kontextu je zmenšení aktivního kontextu výběrem, shrnutím nebo nahrazením starší historie kompaktnější reprezentací tak, aby se běh vešel do kontextového okna.
  ],
  description: terms => [
Správa aktivního kontextu je součástí kontextového inženýrství (#term(terms.context_engineering, language: "en", marker: false, linked: false, emphasized: false)). Při rozsáhlejších úlohách se kontextové okno nevyhnutelně zaplní. V okamžiku, kdy objem historie dosáhne kritické hranice, musí agent harness přistoupit ke kompakci kontextu _compaction_ @jiang2023llmlingua — model je vyzván, aby dosavadní průběh sezení zkrátil do syntetického souhrnu, který nahradí starší část historie.

Tento proces však představuje destruktivní ztrátovou kompresi:
- Ztráta deterministických detailů: Model při rekurzivním zkracování vynechává přesná čísla řádků, signatury privátních funkcí, přesné cesty k souborům a doslovná chybová hlášení kompilátoru.
- Oslabení negativních pravidel: Explicitní zákazy (např. neměnit veřejné rozhraní API) bývají v souhrnu zevšeobecněny nebo zcela vypuštěny.
- Konfirmační zkreslení (_Confirmation Bias_): Model v souhrnu upřednostňuje fakta odpovídající jeho vnitřním statistickým asociacím na úkor netriviálních specifik konkrétního projektu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "context_window"),),
)