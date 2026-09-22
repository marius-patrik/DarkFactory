#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "model_inference_intro",
  title: [Úvod],
  definition: terms => [
Jazykový model je v této práci chápán jako pravděpodobnostní komponenta, která při inferenci zpracovává omezený vstup a generuje další tokeny.
  ],
  description: terms => [
Oddělení modelu od inferenčního enginu umožňuje přesně určit, které vlastnosti patří modelové architektuře, které běhovému provedení inference a které už musí zajistit Harness.
  ],
)
