// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "lib/odborna-prace.typ": draft, added

#let meta = (
  nazev: "Úvod do agentického AI a design autonomní pipeline pro softwarový vývoj",
  podnazev: "Návrh a realizace systému DarkFactory",

  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,

  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,

  anotace: added[
    Tato odborná práce představuje návrh, implementaci a provozní ověření systému
    DarkFactory — modulární platformy pro autonomní vývoj softwaru na GitHubu.
    Systém přebírá celý životní cyklus vývojového požadavku od zadání v GitHub Issues,
    přes interpretaci a technické plánování, až po generování kódu, běh testů
    a vystavení pull requestu. Důraz je kladen na lidskou kontrolu prostřednictvím
    dvoustupňového schvalování (Human Gate) a na spolehlivost provozu zajištěnou
    automatickou rotací modelů při vyčerpání API kvót a bezeztrátovým ukládáním
    stavu. Celá infrastruktura je sdílena napříč repozitáři formou znovupoužitelných
    workflow a řízena jediným manifestem (.github/darkfactory.json). Systém byl
    úspěšně nasazen na tři repozitáře zahrnující vývoj v Pythonu i sazbu této práce
    v systému Typst, přičemž dosáhl 86,9% úspěšnosti dokončení úloh.
  ],
  abstract: added[
    This thesis presents the design, implementation, and operational evaluation of
    DarkFactory, a modular platform for autonomous software engineering on GitHub.
    The system automates the complete lifecycle of an engineering request: from issue
    intake, semantic interpretation, and technical planning, to code generation,
    testing, and pull request delivery. Governance is maintained through a two-gate
    human approval contract, while operational reliability is ensured via automated
    model and account rotation upon API quota exhaustion and lossless state
    checkpointing. The entire pipeline is shared across repositories via reusable
    workflows and governed by a single configuration manifest (.github/darkfactory.json).
    The system was deployed across three repositories covering Python software and
    the typesetting of this thesis in Typst, achieving an 86.9% completion rate.
  ],

  klicova-slova: (
    "autonomní systémy", "softwarové inženýrství", "kontinuální integrace",
    "orchestrace agentů", "jazykové modely",
  ),
  keywords: (
    "autonomous systems", "software engineering", "continuous integration",
    "agent orchestration", "language models",
  ),

  podekovani: none,
)
