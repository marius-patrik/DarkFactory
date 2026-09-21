#import "/DarkFactory/templates/common.typ": term, finalized
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "methodology",
  title: [Metodika práce],
  definition: terms => [
#finalized[
Práce porovnává veřejně popsané principy současných agentních systémů, rozděluje je do samostatných konceptů a používá je při návrhu DarkFactory.
]
  ],
  description: terms => [
#finalized[
Předmětem práce není trénování neuronových sítí, optimalizace vah ani podrobná matematika modelového učení. #term(terms.language_model) je chápán jako hotová inferenční komponenta a je popsán pouze v rozsahu potřebném pro další části práce.

Architektura kolem modelu je rozložena do samostatných konceptů, aby měl každý mechanismus vlastní definici, popis a nebylo nutné stejné vysvětlení opakovat v několika kapitolách.

Navržené principy jsou následně promítnuty do DarkFactory.
]
  ],
)
