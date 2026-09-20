#import "../../../../templates/common.typ": define-term, translation, accepted, alert
#import "../../../schema.typ": concept

#let terminology = define-term(
  id: "methodology",
  proper: translation(cs: "Metodika práce", en: "Methodology"),
  keyword: false,
)

#let item = concept(
  key: "methodology",
  term: terminology,
  definition: terms => [
#accepted[
Práce má teoreticko-architektonický a inženýrský charakter. Vzhledem k dynamickému vývoji v oblasti autonomního softwarového vývoje práce důsledně zachovává a integruje zavedené anglické odborné názvy (např. _harness_, _pull request_, _agent loop_, _prompt engineering_, _skills_ či _context rot_). Použití této terminologie je integrální součástí práce, neboť tyto anglické pojmy představují de facto celosvětové průmyslové standardy (_industry standards_), jejichž doslovný český překlad by byl nejednoznačný, zavádějící či v rozporu s běžnou inženýrskou praxí.

Postup práce sleduje strukturu inženýrského cyklu:

- 1. Analýza konceptu: Systematické zmapování limitů autoregresivních modelů, dynamiky kontextového okna, jevu Context Rot a rozhraní nástrojů.
- 2. Návrh architektury: Formulace modulárního modelu agent harnessu, správy stavu, exekučního pískoviště, bezpečnostních pojistek a orchestrace subagentů.
- 3. Kritické zhodnocení: Porovnání navržených principů s volnými agentními smyčkami a vymezení provozních limitů autonomního inženýrství.
]
  ],
  document_enabled: true,
  document_after: terms => [
#alert[
  Chybějící evaluační rámec v metodice:
  Metodika práce v současné podobě popisuje inženýrský postup, ale postrádá formální specifikaci evaluačního rámce: definici vzorku úloh pro ověření spolehlivosti (syntetické úlohy vs. reálné bugfixy), stanovení kontrolních metrik (úspěšnost na první pokus, spotřeba tokenů na úspěšný PR) a srovnávací baseline.
]
  ],
  relations: ((type: "dependency", target: "thesis_objectives_research_questions"),),
)
