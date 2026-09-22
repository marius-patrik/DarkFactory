#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "hooks",
  keyword: "Hooks",
  citation: bib.claude_code_hooks,
  source: bib.claude_code_hooks,
  definition: terms => [
Konfigurované reakce spouštěné při určených událostech životního cyklu agentního prostředí. #cite(bib.claude_code_hooks)
  ],
  description: terms => [
Hook může před nebo po vybrané události spustit deterministickou logiku, například validaci, příkaz nebo jinou automatizaci. #cite(bib.claude_code_hooks)
  ],
  practical: terms => [
Hooks umožňují spustit deterministickou kontrolu nebo reakci v definovaném bodě životního cyklu a vynutit chování nezávisle na tom, zda jej model sám navrhne.
  ],
  relations: ((type: "dependency", target: "harness"),),
)
