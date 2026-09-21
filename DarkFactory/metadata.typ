// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/common.typ": translation

#let meta = (
  // The main title is structural and comes from DarkFactory/index.typ.
  title-suffix: translation(cs: "", en: ""),
  title-lines: (
    cs: ("DarkFactory:", "Agentic Engineering in practice", "(Agentické inženýrství v praxi)"),
    en: ("DarkFactory:", "Agentic Engineering in practice", "(Agentické inženýrství v praxi)"),
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
    Teoretická část vymezuje mechanismy softwarového inženýrství, jazykových modelů, správy kontextu, nástrojů, řízení provádění a multiagentních systémů.
    Praktická část popisuje systém DarkFactory, který odděluje modelové rozhodování od trvalého stavu, prostředí, capabilities, GitHub control plane, ověřování a bezpečnostních hranic.
    Evaluace používá zdrojový kód, automatické testy a CI výsledky a rozlišuje implementované mechanismy od vlastností, které ještě vyžadují živý end-to-end důkaz.
  ],
  abstract-en: [
    This thesis examines the use of agentic artificial intelligence in software development, focusing on the architecture of an agent harness.
    The theoretical part defines mechanisms from software engineering, language models, context management, tools, execution control, and multi-agent systems.
    The practical part describes DarkFactory, a system that separates model decisions from persistent state, the execution environment, capabilities, the GitHub control plane, verification, and security boundaries.
    The evaluation uses source code, automated tests, and CI results and distinguishes implemented mechanisms from properties that still require live end-to-end evidence.
  ],

  podekovani: none,
)

#let title-value(book-title) = str(book-title.cs)

#let title-display(book-title) = {
  [
    #meta.title-lines.cs.at(0)#linebreak()
    #meta.title-lines.cs.at(1)#linebreak()
    #meta.title-lines.cs.at(2)
  ]
}
