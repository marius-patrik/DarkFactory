#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_intro",
  title: [Úvod],
  definition: terms => [
Tato část odděluje vlastnosti jazykového modelu, jeho běhové inference a limity, které z tohoto způsobu zpracování vyplývají.
  ],
  description: terms => [
Cílem je vymezit hranici modelové vrstvy: končí vytvořením výstupu nad aktuálním kontextem. Trvalý stav úlohy, účinky v externím prostředí, nástroje a dlouhodobé řízení patří až do Harnessu.
  ],
)
