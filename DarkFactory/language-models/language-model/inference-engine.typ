#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let pagedattention_example = example(
  key: "inference_engine_vllm_pagedattention",
  title: [vLLM a PagedAttention],
  source: (bib.vllm_inference_engine, bib.kwon2023pagedattention),
  description: terms => [
vLLM používá mechanismus PagedAttention pro správu KV cache po blocích místo požadavku na jeden souvislý paměťový prostor; práce Kwon et al. popisuje tuto paměťovou správu jako součást serving systému pro LLM. #cite(bib.kwon2023pagedattention) #cite(bib.vllm_inference_engine)
  ],
)

#let item = concept(
  key: "inference_engine",
  term: "Inferenční engine",
  keyword: "Inference Engine",
  citation: (bib.vllm_inference_engine, bib.kwon2023pagedattention),
  source: bib.vllm_inference_engine,
  definition: terms => [
Inferenční engine je běhová vrstva, která načítá model a skutečně provádí jeho dopředné výpočty a autoregresivní generování nad vstupními tokeny. #cite(bib.vllm_inference_engine)
  ],
  description: terms => [
Serving engine může kromě samotného výpočtu plánovat a dávkovat požadavky, spravovat akcelerátorovou paměť a organizovat KV cache. Tím se liší od poskytovatele modelu: provider je přístupové rozhraní nebo služba, zatímco inference engine řeší fyzické provedení modelu a správu runtime prostředků. #cite(bib.kwon2023pagedattention)
  ],
  examples: (pagedattention_example,),
  practical: terms => [
Vlastnosti inference enginu ovlivňují latenci, propustnost, využití paměti a tím i cenu nebo proveditelnost opakovaných a dlouhotrvajících modelových volání. Tyto vlastnosti jsou důležité i tehdy, když je engine skryt za vzdáleným provider API.
  ],
  relations: ((type: "dependency", target: "language_model"), (type: "related", target: "kv_cache")),
)
