#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_question_evaluation",
  czech: "Vyhodnocení výzkumných otázek",
  english: "Research Question Evaluation",
  definition: terms => [
Vyhodnocení výzkumných otázek porovnává navržené mechanismy s tím, co bylo ve snapshotu skutečně implementováno a ověřeno.
  ],
  description: terms => [
*O1 — autonomie při zachování lidského dohledu.* Praktická zkušenost s DarkFactory podporuje architekturu, v níž model neprovádí změny přímo jako nedoložená textová tvrzení, ale pracuje uvnitř řízeného toku s GitHub požadavkem, plánem, deterministickými kontrolami, revizí a slučováním. Úspěšné běhy agentního a schvalovacího workflow spolu s dokončenými deterministickými quality akcemi ukazují, že významnou část rutinního toku lze automatizovat. Plný životní cyklus ve finálním TypeScript #raw("df") enginu však ve snapshotu ještě není uzavřen, takže nelze kvantifikovat konečnou míru autonomie.

*O2 — rozpoznání neproduktivního běhu.* Navržená odpověď kombinuje explicitní stav grafu, rozpočty a limity běhu, deterministické kontrolní uzly, pozorování skutečných účinků a eskalaci k člověku místo nekonečného pokračování modelové smyčky. Implementační evidence této vrstvy je pouze částečná: Request 329 pro natural-stop/result capture a Request 358 pro graph-native orchestration zůstávají otevřené. Práce proto dokládá návrh mechanismu a jeho dílčí infrastrukturu, nikoli empiricky změřenou úspěšnost detekce zacyklení v hotovém produkčním enginu.

*O3 — zachování kontextu.* Architektura uchovává doslovné zadání mimo modelový kontext v GitHub Issue, odděluje trvalý stav běhu od dočasného kontextového okna a používá strukturovaný stav, kompakci a cílené znovunačítání informací. Tím omezuje závislost dlouhé úlohy na jediném rostoucím promptu. Finální důkaz dlouhodobého zachování kontextu napříč přerušením a obnovením běhu je součástí dosud neuzavřené graph-native orchestrace a flotilové akceptace.
  ],
  relations: ((type: "dependency", target: "verified_implementation_state"),),
)
