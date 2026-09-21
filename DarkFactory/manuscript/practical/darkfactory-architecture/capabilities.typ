#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_capability_system_body",
  title: [Systém capabilities],
  definition: terms => [
Agentní a produktové chování DarkFactory není pevně zabudováno do vykonávacího jádra, ale je dodáváno verzovanými capabilities přes společné ABI.
  ],
  description: terms => [
Capability může přidat nástroje, příkazy, graph-node chování, deterministické akce, verifikační pravidla, hooks, dokumentaci nebo požadavky na credentials. Z jedné kanonické TypeScript definice lze generovat podporované adaptéry, takže stejné chování nemusí mít samostatnou ručně udržovanou implementaci pro každý harness nebo integrační formát. #cite(bib.darkfactory)
  ],
)
