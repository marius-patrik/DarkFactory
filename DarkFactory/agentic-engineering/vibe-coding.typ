#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "vibe_coding",
  industry: "Vibe Coding",
  czech: "Vibe coding",
  english: "Vibe Coding",
  citation: bib.fowler2026vibecoding,
  source: bib.fowler2026vibecoding,
  definition: terms => [
Vibe Coding je způsob tvorby softwaru, při kterém člověk popisuje požadované chování modelu přirozeným jazykem, zkouší vzniklý výsledek a dalšími prompty jej upravuje, aniž by průběžně kontroloval samotný vygenerovaný kód.
  ],
  description: terms => [
Označení zavedl Andrej Karpathy v příspěvku na síti X v únoru 2025. Martin Fowler tento původ shrnuje a odlišuje Vibe Coding od běžného používání AI při programování právě tím, že autor záměrně nepracuje s vygenerovaným zdrojovým kódem jako s hlavním předmětem kontroly. #cite(bib.fowler2026vibecoding)

Pro experimenty a malé jednorázové aplikace může být tento způsob velmi rychlý. Pro dlouhodobě udržovaný software však nestačí samotná schopnost rychle generovat změny; důležitá zůstává kontrola požadavků, testů, verzí a výsledného chování systému.
  ],
  summary: terms => [
Vibe Coding ukazuje nejméně kontrolovaný konec spektra práce s agentní AI a pomáhá odlišit rychlé generování od řízeného agentního softwarového inženýrství.
  ],
  relations: ((type: "related", target: "software_engineering"),),
)
