#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "human_in_the_loop",
  industry: "HITL",
  czech: "Zapojení člověka do smyčky",
  english: "Human-in-the-loop",
  citation: bib.mosqueira2023human,
  source: bib.mosqueira2023human,
  definition: terms => [
Zapojení člověka do smyčky (HITL) je návrhový vzor, v němž lidský operátor zůstává součástí rozhodovacího procesu prostřednictvím explicitních schvalovacích bran, zejména před významnými nebo nevratnými operacemi.
  ],
  description: terms => [
Základním principem navrženého řešení není nekritická plná autonomie, nýbrž efektivní kooperace člověka a stroje (#term(terms.human_in_the_loop, language: "en", marker: false, linked: false, emphasized: false) @mosqueira2023human). Autonomnímu systému náleží mechanické a rutinní úkony, zatímco klíčová architektonická a nevratná rozhodnutí zůstávají pod kontrolou vývojáře.

Řízení lidského dohledu staví na několika explicitních bodech. První brána se týká záměru a plánu před zahájením zásahů do repozitáře. Druhá brána se týká sémantické kontroly výsledného diffu před začleněním do hlavní větve. Mezi nimi může harness provádět rutinní kroky samostatně, pokud jsou jejich účinky dohledatelné a ověřitelné.

Moderní code review je kognitivně náročná činnost a porozumění změně patří mezi její hlavní obtíže. Experimentální výsledky zároveň ukazují, že účinek podrobného vedení závisí na složitosti změny a že systematická kontrola může v některých případech snížit kognitivní zátěž @goncalves2022review. Z toho plyne praktický požadavek na harness: lidské brány nemají být zahlceny každou interní iterací agenta. Změny je vhodné předkládat v sémanticky souvisejících celcích, doplnit vysvětlením netriviálních rozhodnutí a zvýraznit zásahy do kritických částí systému.

Dohledatelnost původního zadání zajišťuje trvalé uchování doslovného požadavku v GitHub Issue. Při selhání se nemá modelové vysvětlení zaměňovat za důkaz úspěchu; harness má předat pozorovatelný stav, například diff, chybové hlášení, výsledek kontrol a stav běhu.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "branch_protection"),),
)
