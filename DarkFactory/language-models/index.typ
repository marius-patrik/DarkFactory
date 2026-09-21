#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/language-models/language-model/language-model.typ" as section
#import "/DarkFactory/language-models/language-model/transformer.typ" as transformer
#import "/DarkFactory/language-models/language-model/tokenizer.typ" as tokenizer
#import "/DarkFactory/language-models/language-model/token.typ" as token
#import "/DarkFactory/language-models/language-model/embedding.typ" as embedding
#import "/DarkFactory/language-models/language-model/context-window.typ" as context_window
#import "/DarkFactory/language-models/language-model/kv-cache.typ" as kv_cache

#let node = folder(
  key: "language_models",
  section: section.item,
  concepts: (
    transformer.item,
    tokenizer.item,
    token.item,
    embedding.item,
    context_window.item,
    kv_cache.item,
  ),
)
