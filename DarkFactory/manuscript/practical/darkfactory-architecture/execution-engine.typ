#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_execution_engine_body",
  title: [Vykonávací jádro a stav],
  definition: terms => [
Vykonávací jádro DarkFactory vlastní mechanismy, které musí zůstat konzistentní napříč jednotlivými capabilities: sdílené kontrakty, stav workflow, směrování modelů, dohled nad během, zachycení výsledků a obnovu.
  ],
  description: terms => [
`@darkfactory/protocol` poskytuje browser/runtime-safe serializované kontrakty; `@darkfactory/core` nad nimi exportuje graph/run state, routing, Supervisor, result capture a recovery. Tato hranice odděluje deterministické běhové mechanismy od agentního chování dodávaného capabilities. #cite(bib.darkfactory)
  ],
)
