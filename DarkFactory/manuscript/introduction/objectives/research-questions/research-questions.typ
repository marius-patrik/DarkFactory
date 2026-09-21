#import "/DarkFactory/templates/common.typ": finalized
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_questions",
  czech: "Výzkumné otázky",
  english: "Research Questions",
  definition: terms => [
- #finalized[O1: Jak lze současný agentní systém zapojit do vývoje softwaru tak, aby samostatně prováděl co největší část běžné práce a člověk se soustředil na zadání, kontrolu a důležitá rozhodnutí?]
- O2: Jaké mechanismy harnessu pomáhají rozpoznat a zastavit neproduktivní opakování, oscilaci nebo zacyklení během delší úlohy?
- O3: Jak spravovat pracovní kontext agenta tak, aby při delších úlohách neztrácel důležité požadavky a stav projektu?
  ],
  description: terms => [
Otázky soustřeďují hodnocení na praktickou míru samostatnosti, spolehlivost prováděcí smyčky a zachování potřebného pracovního kontextu.
  ],
  relations: ((type: "dependency", target: "subgoals"),),
)
