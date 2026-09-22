#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "deterministic_verification",
  term: "Deterministické ověření",
  keyword: "Deterministic Verification",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Ověření výsledku změny pomocí přímo pozorovatelných strojových důkazů místo spoléhání na tvrzení modelu o tom, co provedl.
  ],
  description: terms => [
DarkFactory odvozuje výsledek kódového kroku ze skutečně změněných souborů, scope checku, detekovaných verifikačních akcí, jejich exit stavů a případně vytvořeného commitu.
  ],
  relations: ((type: "related", target: "integration_test"),),
)
