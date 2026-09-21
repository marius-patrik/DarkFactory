#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "end_to_end_evaluation_body",
  title: [End-to-end ověření],
  definition: terms => [
Testovací sada ověřuje integrované části agentního běhu a workflow, ale v referenčním evidence setu zatím není jeden reprodukovatelný živý běh, který by prošel celým produkčním životním cyklem Requestu od vytvoření zadání až po merge a následnou rekonciliaci. Tato podmínka je zároveň explicitně vedena jako dosud nesplněná acceptance položka Requestu #359. #cite(bib.darkfactory_request_359)
  ],
  description: terms => [
Integrační testy pokrývají například přechody workflow, review/fix iterace, persistovaný Run State, události GitHubu, required-check gate, nástrojové účinky, modelový failover, result capture a recovery. #cite(bib.darkfactory_e9c10221)

Tato evidence dokládá spolupráci hlavních mechanismů uvnitř testovaného runtime, ale není ekvivalentní živému GitHub scénáři s reálným Requestem, schválením Planningu, vytvořením změny, pull requestem, externími kontrolami, Final Alignment, autorizovaným merge a deterministickou rekonciliací. Dokud takový běh nebude uložen jako reprodukovatelný artefakt evaluace a acceptance v #359 zůstává otevřená, práce jej nepočítá jako splněný end-to-end důkaz. #cite(bib.darkfactory_request_359)
  ],
)
