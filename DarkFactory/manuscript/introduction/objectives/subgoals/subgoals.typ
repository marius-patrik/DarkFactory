#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "subgoals",
  title: [Dílčí cíle],
  definition: terms => [
- Vymezit teoretické mechanismy Software Engineering, Modelu, Harnessu a Agentic Engineering potřebné pro dlouhotrvající agentní vývoj softwaru.
- Navrhnout a implementovat DarkFactory jako systém s explicitním stavem běhu, odděleným prostředím, capability rozhraním, GitHub control plane a oddělenými hranicemi identity a přihlašovacích údajů.
- Realizovat řízený životní cyklus požadavku od zachycení zadání přes Planning a implementaci po deterministické ověření, Final Alignment, integraci a obnovu přerušeného běhu.
- Ověřit implementaci pomocí automatických kontrol, end-to-end scénáře a provozu na vybraných cílových repozitářích a výsledky vztáhnout k výzkumným otázkám.
  ],
  description: terms => [
Dílčí cíle vytvářejí sled od teoretického vymezení přes návrh artefaktu k jeho technickému ověření.
  ],
)
