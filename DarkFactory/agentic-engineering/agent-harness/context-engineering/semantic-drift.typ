#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "semantic-drift",
  proper: translation(cs: "Sémantický posun", en: "Semantic Drift"),
  keyword: false,
  citation: bib.liu2024,
  source: bib.shinn2023reflexion,
)

#let item = concept(
  key: "semantic_drift",
  term: terminology,
  definition: terms => [
Sémantický posun je postupné zkreslování významu a faktického stavu při opakovaném ztrátovém shrnování nebo transformaci kontextu.
  ],
  description: terms => [
Pokud je historie sezení v dlouhém vývojovém běhu shrnována vícekrát po sobě, vzniká řetězec ztrátových transformací ($S_(k+1) = f(S_k, Delta_k)$).

Rizika sémantického posunu spočívají v těchto jevech:
- Efekt tiché pošty: Drobné zkreslení či halucinace vzniklá v kole $k$ je v kole $k+1$ přijata jako nezpochybnitelný historický fakt.
- Divergence modelu od reality: Po několika cyklech komprese se vnitřní model reality agenta zcela rozejde se skutečným stavem zdrojového kódu v souborovém systému.

Výsledkem je stav, kdy agent sebevědomě reportuje vyřešení úkolu, ačkoliv reálný kód zůstává v nefunkčním či neúplném stavu.
  ],
  summary: terms => [
Opakovaná komprese může změnit pracovní reprezentaci reality natolik, že další rozhodování vychází z chybných historických předpokladů.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "context_rot"),),
)