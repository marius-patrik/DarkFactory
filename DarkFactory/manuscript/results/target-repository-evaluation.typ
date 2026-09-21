#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "target_repository_evaluation_body",
  title: [Ověření na cílových repozitářích],
  definition: terms => [
Fleet-level ověření rozlišuje aktivní cílové repozitáře od historických nebo archivovaných položek a hodnotí pouze konkrétní commity s dohledatelnými workflow výsledky.
  ],
  description: terms => [
Repozitář `omnis` byl ověřen na commitu `a53660a1c0c6619f94768e5d520405052fb03df6`. Jeho pipeline run `34708160162` dokončil úspěšně mimo jiné web, paper a docs jobs; samostatné deploy-docs a release joby na stejném commitu byly rovněž úspěšné. #cite(bib.omnis_a53660a1) #cite(bib.omnis_ci_34708160162)

Repozitář `ChessWithQuests` byl ověřen na commitu `50a50797f29c2a636d973981993191a65df3d131`. Pipeline run `34708180783` dokončil úspěšně paper, web a docs jobs a na stejném commitu uspěly také verify-docs, deploy-docs a release kontroly. #cite(bib.chesswithquests_50a50797) #cite(bib.chesswithquests_ci_34708180783)

Původně uváděné repozitáře `template-OdbornaPrace` a `OdbornaPrace-mono` jsou v době evaluace archivované a nejsou proto považovány za aktivní fleet cíle. #cite(bib.template_odbornaprace_repo) #cite(bib.odbornaprace_mono_repo)

Aktivním repozitářem práce je `DarkFactory-Paper`, který nahrazuje starší označení `OdbornaPrace-paper`. Snapshot `5bc04974f9aed0f55295389154124a09059ff35e` prošel úspěšně CI, Deploy Documentation i Release workflow. #cite(bib.darkfactory_paper_5bc04974) #cite(bib.darkfactory_paper_ci_35617820423) #cite(bib.darkfactory_paper_deploy_35617820271) #cite(bib.darkfactory_paper_release_35617820286)

Aktivní fleet evidence tedy v této fázi pokrývá DarkFactory, omnis, ChessWithQuests a DarkFactory-Paper. Dvě původní fleet položky jsou archivované; úplné #361 fleet acceptance proto nelze z těchto výsledků považovat za uzavřené.
  ],
)
