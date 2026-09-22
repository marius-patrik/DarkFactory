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
Inferenční engine zajišťuje praktické provedení modelu, například plánování požadavků, správu výpočetních prostředků a práci s mezipamětí během generování. Nezajišťuje agentní stav, nástroje ani dlouhodobé řízení úlohy; ty patří až do vrstvy Harness. #cite(bib.vllm_inference_engine)
  ],
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "kv_cache")),
)
