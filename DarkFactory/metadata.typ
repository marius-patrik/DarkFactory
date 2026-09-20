// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "/DarkFactory/templates/registry.typ": draft, added, unconfirmed, accepted, finalized, translation

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

  annotation: translation(
    cs: finalized[
      Tato odborná práce se zabývá principy agentického inženýrství (_agentic engineering_):
      efektivními inženýrskými praktikami pro vývoj pomocí umělé inteligence prostřednictvím
      agentických systémů a architekturou těchto systémů. Praktickým přínosem práce je návrh
      a implementace systému DarkFactory — agentního harnessu instalovatelného jako aplikace
      pro platformu GitHub (GitHub App). Systém usiluje o maximální možnou míru automatizace
      vývojového cyklu od interpretace požadavků v GitHub Issues, přes plánování, až po vývoj
      kódu a sloučení změn. Práce reflektuje, že současné agentní systémy nelze vnímat
      jako plně autonomní: jazykové modely vyžadují deterministické mantinely, správu kontextu
      a zapojení člověka (_Human-in-the-loop_).
    ],
    en: finalized[
      This thesis examines the principles of agentic engineering: effective engineering
      practices for development with artificial intelligence through agentic systems and
      the architecture of these systems. The practical contribution of the thesis is the
      design and implementation of DarkFactory — an agentic harness installable as a GitHub App.
      The system aims to maximize automation of the development lifecycle, from interpreting
      requirements in GitHub Issues, through planning, to code development and merging changes.
      The thesis reflects that current agentic systems cannot be regarded as fully autonomous:
      language models require deterministic guardrails, context management, and human involvement
      (_Human-in-the-loop_).
    ],
  ),

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
