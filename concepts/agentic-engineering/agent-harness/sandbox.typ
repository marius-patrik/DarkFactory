#import "../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "../../schema.typ": concept

#let terminology = define-term(id: "sandbox", proper: translation(cs: "Izolované běhové prostředí", en: "Sandbox"), industry: translation(cs: "Sandbox", en: "Sandbox"), explanation_cs: "Omezené běhové prostředí určené k oddělení prováděného kódu a jeho oprávnění od hostitelského systému.", explanation_en: "A constrained runtime environment intended to isolate executing code and its permissions from the host system.", keyword: false, citation: bib.agache2020firecracker, source: bib.agache2020firecracker)

#let item = concept(
  key: "sandbox",
  term: terminology,
  heading: terms => [Sandbox],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Přímé spouštění kódu (_Code Execution_) umožňuje agentovi generovat skripty (bash, Python), které harness spouští v izolovaném terminálu. Tento model poskytuje maximální flexibilitu pro softwarový vývoj, avšak vyžaduje nekompromisní bezpečnostní izolaci.
  ],
  theory_summary: none,
  theory_after: terms => [
#critique[
  Iluzorní bezpečnost pískoviště: Přímé spouštění netestovaného syntetického kódu v běžném Docker kontejneru nelze považovat za plnohodnotnou bezpečnostní hranici (_security boundary_). Přístup k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky environmentálních tajností (GitHub tokeny, API klíče k LLM) přes skryté síťové kanály a kompromitaci CI infrastruktury. Pro bezpečný produkční provoz je nezbytná formální izolace na bázi microVM #diff[(např. AWS Firecracker, gVisor)][(např. AWS Firecracker @agache2020firecracker, gVisor)] a striktní izolace síťových jmenných prostorů.
]
  ],
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "tool_calling"),)
)