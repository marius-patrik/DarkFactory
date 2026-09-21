#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "integration_test",
  industry: "Integration Test",
  czech: "Integrační test",
  citation: bib.sommerville2016,
  source: bib.sommerville2016,
  definition: terms => [
Ověření spolupráce více komponent nebo vrstev systému přes jejich skutečná rozhraní.
  ],
  description: terms => [
V agentním vývoji ověřuje, že změna funguje nejen izolovaně, ale také v toku mezi částmi aplikace, službami, úložišti nebo automatizačními kroky. #cite(bib.sommerville2016)
  ],
  relations: ((type: "dependency", target: "continuous_integration"),),
)
