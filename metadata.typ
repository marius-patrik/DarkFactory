// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "templates/registry.typ": draft, added, unconfirmed, accepted, finalized, translation

#let meta = (
  // Oficiální školní varianta.
  nazev: "Agentické inženýrství a design harnessu pro automatizovaný softwarový vývoj",
  // Volitelné jazykové projekce používané při alternativní kompilaci.
  nazev-cs: "Agentické inženýrství a návrh řídicího systému pro automatizovaný softwarový vývoj",
  nazev-en: "Agentic Engineering and Harness Design for Automated Software Development",
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
