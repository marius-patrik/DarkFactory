// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/common.typ": translation

#let meta = (
  // The main title is structural and comes from DarkFactory/index.typ.
  title-suffix: translation(cs: "", en: ""),
  title-lines: (
    cs: ("DarkFactory:", "Agentické inženýrství v praxi"),
    en: ("DarkFactory:", "Agentické inženýrství v praxi"),
  ),
  podnazev: none,

  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,

  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,

  annotation-cs: [
    Odborná práce zkoumá využití agentní umělé inteligence při vývoji softwaru se zaměřením na architekturu agentního harnessu.
    Teoretická část sleduje přechod od AI-asistovaného vývoje přes jazykový model a inferenci k Harnessu a Agentickému inženýrství.
    Praktická část odděluje kanonickou dokumentaci DarkFactory, životní cyklus změny a vyhodnocení dostupných důkazů.
    Evaluace používá zdrojový kód, automatické testy a CI výsledky a výslovně rozlišuje prokázané mechanismy od neprokázaného plného produkčního průchodu.
  ],
  abstract-en: [
    This thesis examines the use of agentic artificial intelligence in software development, focusing on the architecture of an agent harness.
    The theoretical part follows the transition from AI-assisted development through language-model inference to the harness and agentic engineering.
    The practical part separates the canonical DarkFactory documentation, the software-change lifecycle, and evaluation of the available evidence.
    The evaluation uses source code, automated tests, and CI results and explicitly distinguishes demonstrated mechanisms from a full production lifecycle that was not demonstrated.
  ],

  podekovani: none,
)

#let title-value(book-title) = str(book-title.cs)

#let title-display(book-title) = {
  meta.title-lines.cs.join(linebreak())
}
