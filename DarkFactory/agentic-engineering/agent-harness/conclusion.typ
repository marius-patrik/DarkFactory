#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "harness_conclusion",
  title: [Závěr],
  definition: terms => [
Harness mění izolované modelové volání na stavový systém schopný opakovaně pozorovat prostředí, volit akce a zachovávat průběh práce.
  ],
  description: terms => [
Sám ale neurčuje, jak má být kontext kurátorován, autonomie omezována nebo práce rozdělována mezi více agentů. To je úloha Agentického inženýrství.
  ],
)
