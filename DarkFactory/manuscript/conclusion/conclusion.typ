#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "conclusion",
  czech: "Závěr",
  english: "Conclusion",
  definition: terms => [
Práce zkoumala, jak lze současnou agentní AI účinně zapojit do vývoje softwaru a jakou architekturu musí mít agent harness, aby spojoval vysokou míru autonomie s pozorovatelnými účinky a lidským dohledem.
  ],
  description: terms => [
Hlavního cíle bylo dosaženo na úrovni návrhu architektury a jeho významné části byly ověřeny implementací DarkFactory. Práce ukazuje, že praktické použití agentní AI není pouze otázkou schopností jazykového modelu. Klíčová je vrstva kolem modelu: správa trvalého zadání a stavu, nástrojové rozhraní, izolované provádění, detekce skutečného stavu repozitáře, deterministické kontroly, Git/GitHub workflow, řízené lidské brány a explicitní životní cyklus úlohy.

K O1 práce ukazuje, že rutinní kroky lze přesouvat na agentní systém tehdy, když harness převádí modelová rozhodnutí na dohledatelné akce a odděluje modelové tvrzení od skutečného účinku. K O2 navrhuje kombinaci stavového grafu, rozpočtů, kontrolních uzlů a deterministické eskalace místo neomezené monolitické smyčky. K O3 odděluje trvalý stav a doslovné zadání od omezeného pracovního kontextu modelu a kombinuje je s kompakcí a cíleným načítáním informací.

Implementace DarkFactory potvrzuje použitelnost několika těchto principů: detekovaný quality systém, capability-resolved deterministické akce, GitHub autentizační hranice, nativní dokumentační graf a společné operátorské kontrakty existují v aktuálním kódu a procházejí automatizovanými kontrolami. Současně však evaluace ukazuje hranici současného výsledku. Ve zvoleném snapshotu ještě nejsou uzavřeny finalizace produkčního #raw("df") enginu, finální distribuční release ani šestirepozitářová flotilová akceptace. Práce proto netvrdí, že DarkFactory již představuje plně dokončený produkční systém nebo že byla empiricky změřena konečná míra autonomie.

Výsledkem je konkrétní, implementací podpořená architektura agentního harnessu a přesně vymezený soubor mechanismů, které umožňují používat současnou agentní AI efektivněji a kontrolovatelněji při vývoji softwaru. Dalším krokem je dokončení otevřených integračních bodů, vydání finálního artefaktu a opakovatelná akceptace napříč cílovými repozitáři; teprve tato evidence umožní rozšířit závěry o kvantitativní provozní výsledky.
  ],
  relations: ((type: "dependency", target: "results_discussion"),),
)
