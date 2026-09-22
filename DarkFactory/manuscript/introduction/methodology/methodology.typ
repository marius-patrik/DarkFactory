#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "methodology",
  title: [Metodika],
  definition: terms => [
Práce používá konstrukční přístup odpovídající design science: vymezuje problém a cíle řešení, navrhuje a implementuje artefakt DarkFactory a následně jej vyhodnocuje pomocí reprodukovatelných technických důkazů. #cite(bib.hevner2004designscience) #cite(bib.peffers2007dsrm)
  ],
  description: terms => [
Teoretická část vychází z odborných článků, standardů, protokolových specifikací a primární dokumentace současných agentních systémů. Jednotlivé mechanismy jsou rozděleny do samostatných konceptů, aby bylo možné oddělit vlastnosti #term(terms.language_model), harnessu a technik Agentic Engineering.

Předmětem práce není trénování neuronových sítí, optimalizace vah ani matematický rozbor učení modelu. #term(terms.language_model) je chápán jako hotová inferenční komponenta a je popsán pouze v rozsahu potřebném pro vysvětlení architektury okolního systému.

Praktická část používá zdrojový kód, typované kontrakty, testy, workflow a generované artefakty DarkFactory jako primární důkaz skutečné implementace. Evaluace rozlišuje architektonický důkaz, automatizované funkční testy, CI nad konkrétním commitem a provozní ověření na konkrétních cílových repozitářích. Tvrzení o kompletním produkčním Request lifecycle je přijato pouze tehdy, pokud existuje reprodukovatelný živý průchod od schválení Planningu po merge a rekonciliaci; aktuální absence tohoto důkazu je uvedena jako omezení, nikoli nahrazena architektonickým předpokladem.

Práce neprovádí statistický benchmark obecné výkonnosti agentních systémů. Odpovědi na výzkumné otázky jsou omezeny na tvrzení podporovaná konkrétními reprodukovatelnými důkazy.
  ],
)
