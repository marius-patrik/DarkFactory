#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "end_to_end_evaluation_body",
  title: [End-to-end ověření],
  definition: terms => [
V referenčním evidence setu uzavřeném 21. září 2026 není reprodukovatelný živý běh, který by prošel celým produkčním životním cyklem Requestu od schválení Planningu až po merge a následnou rekonciliaci. Stejná podmínka je v DarkFactory vedena jako nesplněná acceptance položka Requestu #359. #cite(bib.darkfactory_request_359)
  ],
  description: terms => [
Integrační testy pokrývají přechody workflow, review/fix iterace, persistovaný Run State, události GitHubu, required-check gate, nástrojové účinky, modelový failover, result capture a recovery. #cite(bib.darkfactory_e9c10221)

Tato evidence dokládá spolupráci hlavních mechanismů uvnitř testovaného runtime, ale není ekvivalentní živému GitHub scénáři s reálným Requestem, schválením Planningu, vytvořením změny, pull requestem, externími kontrolami, Final Alignment, autorizovaným merge a deterministickou rekonciliací. Evaluace proto plný produkční end-to-end průchod nepovažuje za prokázaný. #cite(bib.darkfactory_request_359)
  ],
)
