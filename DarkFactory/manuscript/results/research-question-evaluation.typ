#import "/DarkFactory/templates/common.typ": issue
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_question_evaluation",
  czech: "Vyhodnocení výzkumných otázek",
  english: "Research Question Evaluation",
  definition: terms => [
Posouzení, jak navržená architektura DarkFactory odpovídá na stanovené otázky.
  ],
  description: terms => [
O1 — autonomie při zachování lidského dohledu: harness odděluje zadání, provádění, automatické kontroly a lidská rozhodnutí tak, aby rutinní kroky mohl vykonávat agent a člověk zůstal u významných rozhodnutí.

O2 — rozpoznání neproduktivního běhu: návrh používá explicitní stav, limity běhu, deterministické kontroly a eskalaci k člověku namísto neomezeného pokračování modelové smyčky.

O3 — zachování kontextu: trvalý stav úlohy je oddělen od omezeného kontextového okna modelu a potřebné informace lze průběžně komprimovat a znovu načítat.

#issue[Každou odpověď O1–O3 propojit s konkrétním ověřitelným prvkem návrhu nebo implementace a s výsledkem kontroly/testu. Současné znění je argumentační shrnutí, nikoli ještě doložená evaluace.]
  ],
  relations: (),
)
