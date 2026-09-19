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
    cs: accepted[
      Tato odborná práce se zabývá principy agentního inženýrství (_agentic engineering_)
      a architekturou řídicích harnessů pro automatizovaný vývoj softwaru. Praktickým
      přínosem práce je návrh a implementace systému DarkFactory — agentního harnessu
      instalovatelného jako aplikace pro platformu GitHub (GitHub App). Systém usiluje
      o maximální možnou míru automatizace vývojového cyklu od sémantické analýzy požadavků
      v GitHub Issues, přes technické plánování, až po generování kódu a vystavení
      pull requestu. Práce reflektuje, že současné agentní systémy nelze vnímat jako
      plně autonomní: jazykové modely vyžadují deterministické mantinely proti uvíznutí
      v nekonečných cyklech, správu kontextu bez sémantického posunu a především
      kontinuální zapojení člověka formou schvalovacích bran (_Human-in-the-loop_).
    ],
    en: accepted[
      This thesis explores the foundational principles of agentic engineering and harness
      architecture for automated software development. The practical contribution of the
      work is the design and implementation of DarkFactory — an agentic harness installable
      as a GitHub App. The system aims to maximize the automation of the software engineering
      lifecycle, ranging from issue interpretation in GitHub Issues and technical planning
      to code generation and pull request delivery. The thesis emphasizes that modern agentic
      systems cannot be considered fully autonomous: large language models require deterministic
      guardrails against infinite loops, rigorous context management without semantic drift,
      and indispensable human-in-the-loop governance via approval gates.
    ],
  ),

  podekovani: none,
)
