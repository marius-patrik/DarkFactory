#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let architecture-box(title, body) = rect(
  width: 100%,
  inset: 7pt,
  radius: 3pt,
  stroke: 0.7pt + luma(90),
  fill: luma(248),
)[
  #align(center)[
    #strong(title)
    #linebreak()
    #text(size: 9pt)[#body]
  ]
]

#let item = section(
  key: "darkfactory_architecture_overview_body",
  title: [Celková architektura],
  definition: terms => [
DarkFactory odděluje stabilní běhové mechanismy od agentního a doménového chování a od externích integračních hranic.
  ],
  description: terms => [
Root Bun workspace je rozdělen na protocol, core, capability, GitHub, keychain, auth, docs, CLI a web. Core vlastní provádění a stav, capability vrstva rozšiřitelné chování, GitHub trvalou vývojovou řídicí vrstvu a samostatné auth/keychain balíčky oddělují lidskou identitu od strojových přihlašovacích údajů. #cite(bib.darkfactory)
  ],
  visual: terms => [
#figure(
  stack(
    dir: ttb,
    spacing: 5pt,
    architecture-box([Rozhraní], [df CLI · DarkFactory Web · DarkFactory Docs]),
    align(center)[↓],
    architecture-box([Sdílené kontrakty], [@darkfactory/protocol]),
    align(center)[↓],
    architecture-box(
      [Vykonávací jádro],
      [@darkfactory/core · Run State · Supervisor · Model Routing · Result Capture · Recovery],
    ),
    align(center)[↓],
    grid(
      columns: (1fr, 1fr, 1fr),
      gutter: 6pt,
      architecture-box(
        [Rozšiřitelné chování],
        [@darkfactory/capability · Capability ABI · capabilities],
      ),
      architecture-box(
        [Externí integrace],
        [@darkfactory/github · GitHub control plane],
      ),
      architecture-box(
        [Identita],
        [@darkfactory/keychain · @darkfactory/auth],
      ),
    ),
  ),
  caption: [Vrstevnaté rozdělení odpovědností v architektuře DarkFactory. Schéma zobrazuje logické vlastnictví komponent, nikoli úplný graf všech importů a běhových volání.],
)
  ],
)
