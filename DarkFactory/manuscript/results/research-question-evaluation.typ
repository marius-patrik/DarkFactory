#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "research_question_evaluation",
  czech: "Vyhodnocení výzkumných otázek",
  english: "Research Question Evaluation",
  definition: terms => [
Strukturované přiřazení každé výzkumné otázky ke konkrétním důkazům, ze kterých bude možné ve finální evaluaci odvodit omezenou odpověď.
  ],
  description: terms => [
O1 bude vyhodnocena pomocí end-to-end životního cyklu Requestu, explicitních schvalovacích bodů, deterministických kontrol, pull requestu a finální integrace. Tato evidence může doložit umístění lidských rozhodnutí a samostatně prováděných kroků, nikoli obecně určit „maximální“ možnou míru autonomie.

O2 bude vyhodnocena pomocí omezení počtu tahů a času, chování Supervisoru při selhání kandidáta nebo kvótě, review/fix smyček, deterministického zachycení výsledku a recovery/resume scénáře. Důkaz musí zahrnovat, že již přijaté deterministické účinky nejsou při pokračování zbytečně opakovány.

O3 bude vyhodnocena pomocí oddělení Run State, Session/Transcriptu a modelového kontextu a pomocí reprodukovatelného přerušení a obnovení běhu. Evidence musí ukázat zachování nezbytného trvalého stavu; sama o sobě nebude dokazovat nulovou informační ztrátu pro libovolně dlouhou úlohu.
  ],
  relations: (),
)
