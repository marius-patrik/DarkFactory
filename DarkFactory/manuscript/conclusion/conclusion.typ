#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "conclusion",
  czech: "Závěr",
  english: "Conclusion",
  definition: terms => [
Práce zkoumala, jak lze současnou agentní AI účinně zapojit do vývoje softwaru a jakou architekturu musí mít agent harness, aby spojoval autonomii s kontrolovatelným prováděním.
  ],
  description: terms => [
Výsledný návrh odděluje jazykový model od vrstvy, která spravuje stav, nástroje, provádění, automatické kontroly a lidské rozhodovací body.

K O1 architektura přesouvá rutinní kroky na agentní systém a ponechává člověku zadání, kontrolu a důležitá rozhodnutí. K O2 používá explicitní stav, limity, kontrolní uzly a eskalaci namísto neomezené smyčky. K O3 odděluje trvalý stav úlohy od omezeného pracovního kontextu modelu.

DarkFactory tyto principy převádí do konkrétní architektury harnessu. Kvantitativní srovnání výkonu agentů, ceny nebo dlouhodobé spolehlivosti však vyžaduje samostatnou experimentální evaluaci.
  ],
  relations: ((type: "dependency", target: "results_discussion"),),
)
