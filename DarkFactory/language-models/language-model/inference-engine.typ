#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "inference_engine",
  term: "Inferenční engine",
  keyword: "Inference Engine",
  citation: bib.vllm_inference_engine,
  source: bib.vllm_inference_engine,
  definition: terms => [
Běhová vrstva, která načte jazykový model a provádí jeho inferenci nad vstupními tokeny. #cite(bib.vllm_inference_engine)
  ],
  description: terms => [
Inferenční engine zajišťuje praktické provedení modelu, například plánování inferenčních požadavků, správu výpočetních prostředků a práci s mezipamětí během generování. #cite(bib.vllm_inference_engine)
  ],
  practical: terms => [
Inferenční engine převádí požadavek na skutečné provedení modelu a ovlivňuje dostupné parametry, latenci a způsob obsluhy dlouhých agentních běhů.
  ],
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "kv_cache")),
)
