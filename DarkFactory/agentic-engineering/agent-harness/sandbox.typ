#import "/DarkFactory/templates/common.typ": bib
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
Přímé spouštění kódu umožňuje agentovi vytvářet skripty a příkazy, které harness provádí v řízeném prostředí. Flexibilita tohoto přístupu současně zvětšuje bezpečnostní význam hranice mezi generovaným kódem, pracovními soubory, sítí, tajnostmi a hostitelským systémem.

Běžné linuxové kontejnery využívají izolační mechanismy hostitelského jádra a samy o sobě nepředstavují stejnou bezpečnostní hranici jako samostatný virtualizovaný kernel. Dokumentace gVisoru proto výslovně rozlišuje běžnou kontejnerovou izolaci od silnějších sandboxových přístupů a upozorňuje, že samotné mechanismy sdíleného jádra je nutné správně omezit @gvisor2026security. Pro nedůvěryhodný modelově generovaný kód má harness kromě procesní izolace explicitně řídit mounty, oprávnění, síť a dostupnost tajností. U rizikovějších úloh může použít silnější hranici, například microVM typu Firecracker @agache2020firecracker.

Bezpečnost sandboxu proto není vlastností jediného runtime přepínače. Je výsledkem kombinace izolační technologie a minimálních oprávnění, omezeného souborového a síťového přístupu, řízení tajností a pozorovatelného životního cyklu spuštěného procesu.
  ],
  summary: terms => [
Bezpečné spouštění modelově generovaného kódu vyžaduje vynutitelnou izolaci procesů, souborů, oprávnění, tajností a sítě; podle rizika může být nutná silnější hranice než běžný kontejner.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "tool_calling"),),
)
