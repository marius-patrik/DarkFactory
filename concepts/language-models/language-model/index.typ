#import "../../schema.typ": folder
#import "language-model.typ" as section
#import "transformer.typ" as transformer
#import "autoregression.typ" as autoregression
#import "stochastic-decoding.typ" as stochastic_decoding
#import "tokenizer.typ" as tokenizer
#import "token.typ" as token
#import "embedding.typ" as embedding
#import "context-window.typ" as context_window
#import "kv-cache.typ" as kv_cache
#import "turn.typ" as turn

#let node = folder(
  key: "language_model",
  section: section.item,
  concepts: (
    transformer.item,
    autoregression.item,
    stochastic_decoding.item,
    tokenizer.item,
    token.item,
    embedding.item,
    context_window.item,
    kv_cache.item,
    turn.item,
  ),
)
