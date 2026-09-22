#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "system_verification",
  title: [Ověření systému],
  definition: terms => [
Integrační testy dokazují spolupráci hlavních runtime mechanismů, ale evidence uzavřená 21. září 2026 neobsahuje jeden reprodukovatelný živý průchod celým produkčním životním cyklem změny.
  ],
  description: terms => [
Testy pokrývají workflow přechody, review/fix iterace, persistovaný stav, GitHub události, required-check gate, nástrojové účinky, failover a recovery. #cite(bib.darkfactory_e9c10221) Plný df-only průchod od schválení Planningu po merge a následnou rekonciliaci zůstal zároveň otevřenou acceptance položkou Requestu #359, a proto není v této práci považován za prokázaný. #cite(bib.darkfactory_request_359)
  ],
)
