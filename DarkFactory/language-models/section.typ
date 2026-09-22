#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model",
  title: [Jazykový model],
  definition: terms => [
Tato kapitola odděluje vlastnosti jazykového modelu, jeho běhové inference a limity, které z tohoto způsobu zpracování vyplývají.
  ],
  description: terms => [
Modelová vrstva končí vytvořením výstupu nad aktuálním kontextem. Trvalý stav úlohy, účinky v externím prostředí, nástroje a dlouhodobé řízení patří až do Harnessu.
  ],
  conclusion: terms => [
Modelová vrstva poskytuje inferenční výstup, nikoli kontinuitu dlouhotrvající úlohy ani provedení účinků v externím prostředí. Přechod od izolovaného modelového volání k systému schopnému dlouhodobě jednat proto vyžaduje další vrstvu: Harness.
  ],
)
