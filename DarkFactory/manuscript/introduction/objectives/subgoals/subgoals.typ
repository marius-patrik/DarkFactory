#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "subgoals",
  title: [Dílčí cíle],
  definition: terms => [
- Vymezit teoretické mechanismy Software Engineering, Modelu, Harnessu a Agentic Engineering potřebné pro dlouhotrvající agentní vývoj softwaru.
- Navrhnout a implementovat DarkFactory s explicitním stavem běhu, odděleným prostředím, capability rozhraním, GitHub control plane a oddělenými hranicemi lidské a strojové identity.
- Implementovat mechanismy řízeného životního cyklu požadavku: Planning, deterministické ověření, review/fix, Final Alignment, integraci a obnovu přerušeného běhu.
- Ověřit implementované mechanismy automatickými testy a CI nad konkrétním commitem.
- Ověřit přenositelnost vybraných částí řešení na konkrétních cílových repozitářích a samostatně vyhodnotit, zda existuje důkaz celého živého end-to-end Request lifecycle.
- Vztáhnout zjištěné výsledky a jejich omezení přímo k výzkumným otázkám.
  ],
  description: terms => [
Dílčí cíle oddělují teoretické vymezení, konstrukci artefaktu a jednotlivé úrovně jeho ověření. Nesplněná nebo neprokázaná úroveň evaluace proto nemusí být nahrazena silnějším tvrzením z jiné vrstvy důkazů.
  ],
)
