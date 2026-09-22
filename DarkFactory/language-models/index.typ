#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/language-models/introduction.typ" as introduction
#import "/DarkFactory/language-models/conclusion.typ" as conclusion
#import "/DarkFactory/language-models/language-model/language-model.typ" as language_model
#import "/DarkFactory/language-models/language-model/transformer.typ" as transformer
#import "/DarkFactory/language-models/language-model/tokenizer.typ" as tokenizer
#import "/DarkFactory/language-models/language-model/token.typ" as token
#import "/DarkFactory/language-models/language-model/embedding.typ" as embedding
#import "/DarkFactory/language-models/language-model/inference-engine.typ" as inference_engine
#import "/DarkFactory/language-models/language-model/context-window.typ" as context_window
#import "/DarkFactory/language-models/language-model/kv-cache.typ" as kv_cache
#import "/DarkFactory/language-models/language-model/context-rot.typ" as context_rot
#import "/DarkFactory/language-models/language-model/divergence.typ" as divergence

#let intro = folder(key: "model_inference_intro", section: introduction.item)

#let model = folder(
  key: "language_model_group",
  title: [Jazykový model],
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
    inference_engine.item,
    context_window.item,
    kv_cache.item,
  ),
)

#let limits = folder(
  key: "inference_limits",
  title: [Limity inference],
  concepts: (
    context_rot.item,
    divergence.item,
  ),
)

#let close = folder(key: "model_inference_conclusion", section: conclusion.item)

#let node = folder(
  key: "model",
  title: [Jazykový model a inference],
  children: (
    intro,
    model,
    inference,
    limits,
    close,
  ),
)
