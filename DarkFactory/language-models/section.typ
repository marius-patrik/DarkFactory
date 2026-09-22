#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section
#import "/DarkFactory/language-models/benchmark.typ": benchmark_snapshot

#let item = section(
  key: "model",
  title: [Jazykový model],
  definition: terms => [
Tato kapitola odděluje vlastnosti jazykového modelu, jeho běhové inference a limity, které z tohoto způsobu zpracování vyplývají.
  ],
  description: terms => [
Modelová vrstva končí vytvořením výstupu nad aktuálním kontextem. Trvalý stav úlohy, účinky v externím prostředí, nástroje a dlouhodobé řízení patří až do Harnessu.

Artificial Analysis Intelligence Index v4.3.2 poskytuje bodový snímek současných modelových schopností napříč deseti evaluacemi, mezi nimi Terminal-Bench 4.0 a SciCode. Jde o kompozitní benchmark, nikoli o univerzální pořadí modelů pro každé použití. #cite(bib.artificial_analysis_intelligence_v4_3_2)

#benchmark_snapshot

Dílčí výsledky ukazují rozdílné profily schopností. Claude Fable 5.1 (Max, default fallback) a GPT-6 Astra (max) mají v tomto snímku shodný agregovaný index 53, ale GPT-6 Astra dosahuje vyššího výsledku v Terminal-Bench 4.0 (59 % oproti 52 %), zatímco Claude Fable 5.1 dosahuje vyššího výsledku v SciCode (63 % oproti 56 %). #cite(bib.artificial_analysis_intelligence_v4_3_2) Agregované pořadí a pořadí na jednotlivých benchmarkech se tedy mohou lišit, protože modelová schopnost je vícerozměrná.
  ],
  conclusion: terms => [
Modelová vrstva poskytuje inferenční výstup, nikoli kontinuitu dlouhotrvající úlohy ani provedení účinků v externím prostředí. Přechod od izolovaného modelového volání k systému schopnému dlouhodobě jednat proto vyžaduje další vrstvu: Harness.
  ],
)
