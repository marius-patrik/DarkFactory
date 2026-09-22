#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "subgoals",
  title: [Dílčí cíle],
  definition: terms => [
- Vymezit teoretické mechanismy AI-asistovaného vývoje, jazykového modelu a inference, Harnessu a Agentického inženýrství potřebné pro dlouhotrvající agentní vývoj softwaru.
- Navrhnout a implementovat DarkFactory s explicitním stavem běhu, odděleným prostředím, rozšiřitelným capability rozhraním, GitHubem jako řídicí vrstvou a oddělenými hranicemi lidské a strojové identity.
- Implementovat mechanismy řízeného životního cyklu změny: plánování, deterministické ověření, smyčku revize a opravy, finální kontrolu souladu, integraci a obnovu přerušeného běhu.
- Ověřit implementované mechanismy automatickými testy a CI nad konkrétním commitem.
- Ověřit přenositelnost vybraných částí řešení na konkrétních cílových repozitářích a samostatně vyhodnotit, zda existuje důkaz úplného živého životního cyklu změny.
- Vztáhnout zjištěné výsledky a jejich omezení přímo k výzkumným otázkám.
  ],
  description: terms => [
Dílčí cíle oddělují teoretické vymezení, konstrukci artefaktu a jednotlivé úrovně jeho ověření. Nesplněná nebo neprokázaná úroveň evaluace proto nemusí být nahrazena silnějším tvrzením z jiné vrstvy důkazů.
  ],
)
