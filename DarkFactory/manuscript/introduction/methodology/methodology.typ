#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "methodology",
  title: [Metodika práce],
  definition: terms => [
Práce používá konstrukční přístup odpovídající design science: vymezuje problém a cíle řešení, navrhuje a implementuje artefakt DarkFactory, demonstruje jeho použití a následně jej technicky vyhodnocuje. #cite(bib.hevner2004designscience) #cite(bib.peffers2007dsrm)
  ],
  description: terms => [
Teoretická část vychází z odborných článků, standardů, protokolových specifikací a primární dokumentace současných agentních systémů. Jednotlivé mechanismy jsou rozděleny do samostatných konceptů, aby bylo možné přesně oddělit vlastnosti #term(terms.language_model), harnessu a agentických technik.

Předmětem práce není trénování neuronových sítí, optimalizace vah ani matematický rozbor učení modelu. #term(terms.language_model) je chápán jako hotová inferenční komponenta a je popsán pouze v rozsahu nutném pro vysvětlení dalších částí systému.

Praktická část používá zdrojový kód, typované kontrakty, testy, workflow a generované artefakty DarkFactory jako primární důkaz skutečné implementace. Evaluace kombinuje kontrolu architektonického souladu, automatické buildy a testy, end-to-end průchod řízeným životním cyklem a ověření na vybraných cílových repozitářích.

Práce neprovádí statistický benchmark obecné výkonnosti agentních systémů. Každá odpověď na výzkumnou otázku musí být omezena na tvrzení, která podporují konkrétní reprodukovatelné důkazy.
  ],
)
