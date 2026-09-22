#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept, example

#let paged_kv_example = example(
  key: "kv_cache_pagedattention",
  title: [Bloková správa KV cache ve vLLM],
  source: bib.kwon2023pagedattention,
  description: terms => [
PagedAttention ve vLLM ukládá KV cache do nesouvislých bloků a mapuje logické bloky sekvence na fyzické bloky paměti. Tím řeší proměnlivou velikost cache jednotlivých sekvencí a umožňuje bezpečné sdílení bloků tam, kde je obsah společný. #cite(bib.kwon2023pagedattention)
  ],
)

#let item = concept(
  key: "kv_cache",
  term: "Mezipaměť klíčů a hodnot",
  keyword: "KV Cache",
  citation: (bib.ainslie2023, bib.kwon2023pagedattention),
  source: bib.ainslie2023,
  definition: terms => [
KV cache je runtime mezipaměť dříve vypočtených klíčů a hodnot pozornostních vrstev pro tokeny již zpracovaného prefixu, které lze znovu použít při autoregresivním dekódování dalších tokenů. #cite(bib.ainslie2023)
  ],
  description: terms => [
Opakované použití uložených klíčů a hodnot omezuje potřebu znovu počítat pozornostní reprezentace celého prefixu, ale cache současně spotřebovává paměť a její velikost roste s počtem aktivních tokenů a sekvencí. #cite(bib.kwon2023pagedattention) KV cache je interní runtime mechanismus inference a není totéž co providerové prompt caching, billing cache ani sémantická cache.
  ],
  examples: (paged_kv_example,),
  practical: terms => [
KV cache zrychluje pokračující autoregresivní generování z již zpracovaného prefixu za cenu runtime paměti. Při dlouhých nebo souběžných agentních bězích proto může být správa cache významnou součástí kapacitního plánování inference.
  ],
  relations: ((type: "dependency", target: "transformer"),),
)
