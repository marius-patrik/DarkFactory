#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "sandbox",
    industry: "Sandbox",
  czech: "Izolované běhové prostředí",
  english: "Sandbox",
  citation: bib.agache2020firecracker,
  source: bib.agache2020firecracker,
definition: terms => [
Sandbox je omezené běhové prostředí určené k oddělení prováděného kódu a jeho oprávnění od hostitelského systému.
  ],
  description: terms => [
Přímé spouštění kódu (_Code Execution_) umožňuje agentovi generovat skripty (bash, Python), které harness spouští v izolovaném terminálu. Tento model poskytuje maximální flexibilitu pro softwarový vývoj, avšak vyžaduje nekompromisní bezpečnostní izolaci.

#critique[
  Limity kontejnerového sandboxu: Běžný kontejner sdílí jádro hostitelského systému, a jeho bezpečnost proto závisí na konfiguraci oprávnění, sítě, mountů a přístupu k tajnostem. U nedůvěryhodného generovaného kódu může harness podle rizika použít silnější izolační vrstvu, například microVM typu Firecracker @agache2020firecracker, a současně explicitně omezit síťový přístup a dostupnost tajností.
]
  ],
  summary: terms => [
Bezpečné spouštění modelově generovaného kódu vyžaduje vynutitelnou izolaci procesů, souborů, oprávnění, tajností a sítě; běžný kontejner sám o sobě nemusí tvořit dostatečnou bezpečnostní hranici.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "tool_calling"),),
)