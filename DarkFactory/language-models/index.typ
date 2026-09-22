#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/language-models/section.typ" as section
#import "/DarkFactory/language-models/language-model/language-model.typ" as language_model
#import "/DarkFactory/language-models/language-model/transformer.typ" as transformer
#import "/DarkFactory/language-models/language-model/tokenizer.typ" as tokenizer
#import "/DarkFactory/language-models/language-model/token.typ" as token
#import "/DarkFactory/language-models/language-model/embedding.typ" as embedding
#import "/DarkFactory/language-models/language-model/model-provider.typ" as model_provider
#import "/DarkFactory/language-models/language-model/inference-engine.typ" as inference_engine
#import "/DarkFactory/language-models/language-model/temperature.typ" as temperature
#import "/DarkFactory/language-models/language-model/context-window.typ" as context_window
#import "/DarkFactory/language-models/language-model/kv-cache.typ" as kv_cache
#import "/DarkFactory/language-models/language-model/context-rot.typ" as context_rot

#let architecture = folder(
  key: "model_architecture_representation",
  title: [Architektura a reprezentace],
  concepts: (
    language_model.item,
    transformer.item,
    tokenizer.item,
    token.item,
    embedding.item,
  ),
)

#let inference = folder(
  key: "model_inference",
  title: [Inference],
  concepts: (
    model_provider.item,
    inference_engine.item,
    temperature.item,
    context_window.item,
    kv_cache.item,
    context_rot.item,
  ),
)

#let node = folder(
  key: "model",
  section: section.item,
  children: (
    architecture,
    inference,
  ),
)
