#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "target_repository_evaluation_body",
  title: [Ověření na cílových repozitářích],
  definition: terms => [
Tato část bude obsahovat pouze repozitáře, na kterých byl DarkFactory skutečně spuštěn v rozsahu potřebném pro evaluaci.
  ],
  description: terms => [
Samotná přítomnost instalační konfigurace, workflow nebo submodulu není považována za úspěšné ověření cílového repozitáře. Pro zařazení výsledku je nutný konkrétní commit nebo release DarkFactory, identita cílového repozitáře, provedený scénář a ověřitelné artefakty nebo check runy. Aktuální evidence set tuto fleet-level demonstraci ještě neuzavírá.
  ],
)
