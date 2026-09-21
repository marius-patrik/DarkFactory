// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/common.typ": draft, added, unconfirmed, accepted, finalized, translation

#let meta = (
  // The main title is structural and comes from DarkFactory/index.typ.
  title-suffix: translation(cs: "", en: ""),
  title-lines: (
    cs: ("Agentic AI,", "Agentic Engineering and", "Harness Engineering"),
    en: ("Agentic AI,", "Agentic Engineering and", "Harness Engineering"),
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

  annotation-cs: finalized[
    Tato odborná práce se zabývá současným využitím agentní umělé inteligence při vývoji softwaru.
    Popisuje, jaké části vývojového procesu mohou dnešní agentní systémy provádět samostatně
    a jaké nástroje, pravidla a kontrolní mechanismy potřebují pro opakovatelnou práci nad
    skutečným repozitářem. Praktickou část tvoří návrh a implementace systému DarkFactory,
    který tyto principy převádí do konkrétní architektury agentního harnessu.
  ],
  abstract-en: finalized[
    This thesis examines the current use of agentic artificial intelligence in software development.
    It describes which parts of the development process today's agentic systems can perform
    independently and which tools, rules, and control mechanisms they need for repeatable work
    on a real repository. The practical part is the design and implementation of DarkFactory,
    which applies these principles in a concrete agent-harness architecture.
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
