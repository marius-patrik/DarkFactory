// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/common.typ": translation

#let meta = (
  // The main title is structural and comes from DarkFactory/index.typ.
  title-suffix: translation(cs: "", en: ""),
  title-lines: (
    cs: ("AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory",),
    en: ("AI-asistovaný softwarový vývoj – Agentické inženýrství a harness DarkFactory",),
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
    Kapitoly 2–4 sledují přechod od jazykového modelu přes Harness k AI-asistovanému vývoji a agentickému inženýrství.
    Kapitoly 5–6 oddělují kanonickou dokumentaci DarkFactory od vyhodnocení dostupných důkazů.
    Evaluace používá zdrojový kód, automatické testy a CI výsledky a výslovně rozlišuje prokázané mechanismy od neprokázaného plného produkčního průchodu.
  ],
  abstract-en: [
    This thesis examines the use of agentic artificial intelligence in software development, focusing on the architecture of an agent harness.
    Chapters 2–4 progress from the language model through the harness to AI-assisted development and agentic engineering.
    Chapters 5–6 separate the canonical DarkFactory documentation from evaluation of the available evidence.
    The evaluation uses source code, automated tests, and CI results and explicitly distinguishes demonstrated mechanisms from a full production lifecycle that was not demonstrated.
  ],

  podekovani: none,
)

#let title-value(book-title) = str(book-title.cs)

#let title-display(book-title) = {
  meta.title-lines.cs.join(linebreak())
}
