#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "thesis_introduction",
  title: [Úvod],
  definition: terms => [
Tato práce zkoumá, jak lze současné agentní systémy používat při vývoji softwaru tak, aby jejich autonomie byla spojena s trvalým stavem, ověřitelnými účinky a explicitními kontrolními body.
  ],
  description: terms => [
Teoretická část postupuje od principů softwarového inženýrství přes vlastnosti a limity jazykového modelu k agentnímu harnessu a technikám Agentic Engineering. Praktická část tyto mechanismy vztahuje k systému DarkFactory a odděluje popis implementované architektury od výsledků, které lze doložit testy, CI a provozními artefakty.

Práce se nezaměřuje na trénování modelů. Jazykový model je chápán jako inferenční komponenta uvnitř širšího systému, jehož spolehlivost závisí také na správě stavu, prostředí, nástrojích, verifikaci, bezpečnostních hranicích a způsobu orchestrace.
  ],
)
