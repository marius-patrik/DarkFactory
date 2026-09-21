#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "verified_implementation_state",
  czech: "Ověřený stav implementace",
  english: "Verified Implementation State",
  definition: terms => [
Ověřený stav implementace zahrnuje pouze vlastnosti doložené zdrojovým kódem, úspěšnými automatickými kontrolami nebo uzavřenými implementačními požadavky v evaluačním snapshotu.
  ],
  description: terms => [
Ve snapshotu je dokončen mechanismus detekce jazyků, balíčků a domén a z něj odvozené deterministické quality akce; odpovídající Request 341 je uzavřen. Aktuální CI tuto architekturu používá příkazem #raw("df ci matrix") a spouští detekované kontroly jako matici podle skutečného obsahu repozitáře.

Dokončena je také hranice #raw("@darkfactory/auth") pro uživatelskou autentizaci přes GitHub App (Request 423) a nativní dokumentační cesta #raw("docs.df") → #raw("@darkfactory/docs") → #raw("@darkfactory/web") (Request 424). V CLI je integrován společný registr příkazů používaný operátorskými povrchy, ale celý Request 403 pro dokončení podporovaného CLI zůstává otevřený.

Tyto výsledky ukazují, že navržené dělení odpovědností do detekce, capability vrstvy, deterministických akcí, autentizace, dokumentačního grafu a společných operátorských rozhraní není pouze teoretické. Jednotlivé části existují v produkčním stromu a procházejí automatizovanými kontrolami.
  ],
  relations: ((type: "dependency", target: "evaluation_snapshot"),),
)
