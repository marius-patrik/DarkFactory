// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/common.typ": draft, added, unconfirmed, accepted, finalized, translation

#let meta = (
  // The main title is structural and comes from DarkFactory/index.typ.
  title-suffix: translation(
    cs: "Agentické a harnessové inženýrství: Umělá inteligence v praxi",
    en: "Agentic and Harness Engineering: Artificial Intelligence in Practice",
  ),
  title-lines: (
    cs: ("Agentické a harnessové inženýrství:", "Umělá inteligence v praxi"),
    en: ("Agentic and Harness Engineering:", "Artificial Intelligence in Practice"),
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


#let title-value(book-title, profile: "school") = {
  let language = if profile == "en" { "en" } else { "cs" }
  let main = if language == "en" and book-title.en != none { str(book-title.en) } else { str(book-title.cs) }
  let suffix = if language == "en" and meta.title-suffix.en != none { str(meta.title-suffix.en) } else { str(meta.title-suffix.cs) }
  main + ": " + suffix
}

#let title-display(book-title, profile: "school") = {
  let language = if profile == "en" { "en" } else { "cs" }
  let main = if language == "en" and book-title.en != none { book-title.en } else { book-title.cs }
  let lines = if language == "en" { meta.title-lines.en } else { meta.title-lines.cs }
  [
    #main#linebreak()
    #lines.at(0)#linebreak()
    #lines.at(1)
  ]
}
