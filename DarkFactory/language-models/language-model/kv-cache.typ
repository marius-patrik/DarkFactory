#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "kv_cache",
  term: "Mezipaměť klíčů a hodnot",
  keyword: "KV Cache",
  citation: (bib.dao2022, bib.ainslie2023),
  source: bib.ainslie2023,
  definition: terms => [
Mezipaměť dříve vypočtených klíčů a hodnot v pozornostních vrstvách transformeru používaná při autoregresivním generování. #cite(bib.ainslie2023)
  ],
  description: terms => [
Při generování dalšího tokenu lze uložené klíče a hodnoty předchozí sekvence znovu použít místo jejich úplného přepočítání; paměťové nároky cache přitom rostou s délkou aktivní sekvence. #cite(bib.dao2022) #cite(bib.ainslie2023)
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
