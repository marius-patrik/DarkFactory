#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/language-models/language-model/language-model.typ" as language_model
#import "/DarkFactory/language-models/language-model/transformer.typ" as transformer
#import "/DarkFactory/language-models/language-model/tokenizer.typ" as tokenizer
#import "/DarkFactory/language-models/language-model/token.typ" as token
#import "/DarkFactory/language-models/language-model/embedding.typ" as embedding
#import "/DarkFactory/language-models/language-model/context-window.typ" as context_window
#import "/DarkFactory/language-models/language-model/kv-cache.typ" as kv_cache
#import "/DarkFactory/language-models/language-model/context-rot.typ" as context_rot
#import "/DarkFactory/language-models/language-model/divergence.typ" as divergence

#let language_models = folder(
  key: "model_language_models",
  title: [Jazykové modely],
  concepts: (
    language_model.item,
    transformer.item,
    tokenizer.item,
    token.item,
    embedding.item,
  ),
)

#let inference_context = folder(
  key: "model_inference_context",
  title: [Inferenční kontext],
  concepts: (
    context_window.item,
    kv_cache.item,
  ),
)

#let failure_modes = folder(
  key: "model_failure_modes",
  title: [Limity modelu],
  concepts: (
    context_rot.item,
    divergence.item,
  ),
)

#let node = folder(
  key: "model",
  title: [Model],
  children: (
    language_models,
    inference_context,
    failure_modes,
  ),
)
