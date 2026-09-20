#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
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
Základním principem navrženého řešení není nekritická plná autonomie, nýbrž efektivní kooperace člověka a stroje (#term(terms.human_in_the_loop, language: "en", marker: false, linked: false, emphasized: false) @mosqueira2023human). Autonomnímu systému náleží mechanické a rutinní úkony, zatímco klíčová architektonická a nevratná rozhodnutí zůstávají plně pod kontrolou vývojáře.

Řízení lidského dohledu staví na těchto pilířích:
- Lidské schvalovací brány (_Human Gates_): Formální procesní uzly, v nichž se automatický běh pozastaví a vyčká na autorizaci operátora:
  - 1. brána (Záměr a plán): Člověk autorizuje technický plán a rozpad požadavku dříve, než agent začne modifikovat kód v souborech.
  - 2. brána (Sémantická revize): Člověk provádí finální kontrolu diffu v pull requestu před jeho začleněním do hlavní větve.
- Prevence únavy z revizí (_Review Fatigue_): Vyvážená frekvence kontrol — zamezení mikromanagementu na úrovni jednotlivých souborů při zachování kontroly nad celkovým architektonickým směrem.
- Dohledatelnost původního zadání: Trvalé uchovávání doslovného znění požadavku (GitHub Issue) bez ztrátových parafrází modelem, což brání vymizení okrajových podmínek v průběhu vývoje.
- Transparentnost selhání a deterministická eskalace: Zákaz tichého pohlcování chyb či halucinovaných omluv při selhání. Při vyčerpání rozpočtu nebo selhání testů harness vygeneruje strukturovaný diagnostický incident (diff, chybové hlášení, stav kontextu) a předá jej vývojáři k manuálnímu zásahu.

#critique[
  Omezení lidské schvalovací brány (Review Fatigue):
  Lidská revize ztrácí hodnotu, pokud je změna příliš rozsáhlá nebo nesourodá na to, aby ji bylo možné efektivně posoudit jako jeden celek. Harness proto má změny seskupovat do sémanticky souvisejících kroků, vysvětlovat netriviální rozhodnutí a zvýrazňovat zásahy do kritických částí systému, aby lidská brána nebyla pouze formálním potvrzením výsledku CI.
]
  ],
  summary: terms => [
Lidský dohled je nejúčinnější v několika explicitních branách před zásadními kroky, nikoli v mikromanagementu každé agentní iterace.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "related", target: "branch_protection"),),
)