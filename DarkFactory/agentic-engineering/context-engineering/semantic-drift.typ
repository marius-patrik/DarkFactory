#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "semantic_drift",
  czech: "Sémantický posun",
  english: "Semantic Drift",
  definition: terms => [
Sémantický posun je postupné zkreslování významu nebo faktického stavu při opakovaném ztrátovém shrnování či transformaci kontextu.
  ],
  description: terms => [
Každá další komprese může převzít nepřesnost z předchozí verze jako fakt, až se pracovní reprezentace agenta rozejde se skutečným stavem systému.
  ],
  relations: ((type: "related", target: "context_rot"), (type: "related", target: "compaction")),
)
