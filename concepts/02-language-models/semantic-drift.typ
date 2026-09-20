#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(id: "semantic-drift", proper: translation(cs: "Sémantický posun", en: "Semantic Drift"), explanation_cs: "Postupné zkreslování významu a faktického stavu při opakovaném ztrátovém shrnování nebo transformaci kontextu.", explanation_en: "The gradual distortion of meaning and factual state through repeated lossy summarization or transformation of context.", keyword: false)

#let item = concept(
  key: "semantic_drift",
  term: terminology,
  heading: terms => [Sémantický posun (Semantic Drift)],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Opakovaná ztrátová komprese vede k závažné patologii známé jako sémantický posun (_Semantic Drift_). Pokud je historie sezení v dlouhém vývojovém běhu shrnována vícekrát po sobě, vzniká řetězec ztrátových transformací ($S_(k+1) = f(S_k, Delta_k)$).

Rizika sémantického posunu spočívají v těchto jevech:
- Efekt tiché pošty: Drobné zkreslení či halucinace vzniklá v kole $k$ je v kole $k+1$ přijata jako nezpochybnitelný historický fakt.
- Divergence modelu od reality: Po několika cyklech komprese se vnitřní model reality agenta zcela rozejde se skutečným stavem zdrojového kódu v souborovém systému.

Výsledkem je stav, kdy agent sebevědomě reportuje vyřešení úkolu, ačkoliv reálný kód zůstává v nefunkčním či neúplném stavu.
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
  related: (),
)
