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
  Iluzorní bezpečnost pískoviště: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM (např. AWS Firecracker @agache2020firecracker, gVisor) a striktní izolace síťových jmenných prostorů.
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