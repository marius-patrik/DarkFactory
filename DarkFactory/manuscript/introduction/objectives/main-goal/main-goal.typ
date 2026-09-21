#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "main_goal",
  title: [Hlavní cíl],
  definition: terms => [
Navrhnout a implementovat architekturu agentního harnessu pro dlouhotrvající vývoj softwaru, která odděluje jazykový model od trvalého stavu, prostředí a deterministických kontrolních mechanismů, a technicky ověřit vlastnosti této architektury na systému DarkFactory.
  ],
  description: terms => [
DarkFactory je implementační artefakt této architektury. Splnění cíle se posuzuje podle dohledatelné implementace navržených mechanismů a reprodukovatelných testovacích nebo provozních důkazů. Úplný živý Request lifecycle je samostatná úroveň ověření a nesmí být zaměněn za samotnou existenci architektury nebo úspěšné komponentové testy.
  ],
)
