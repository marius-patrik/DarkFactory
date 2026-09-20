#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "chatgpt-interface-image",
  proper: translation(cs: "Rozhraní aplikace ChatGPT", en: "ChatGPT App Interface"),
  keyword: false,
)

#let item = concept(
  key: "chatgpt_interface_image",
  term: terminology,
  definition: terms => [Oficiální snímek rozhraní aplikace ChatGPT pro macOS.],
  description: terms => [Snímek ukazuje vstupní rozhraní a nabídku práce se soubory, obrazem a webem.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/chatgpt-macos.webp", width: 72%),
  caption: [Rozhraní ChatGPT pro macOS. Zdroj: OpenAI Help Center.],
)
  ],
  summary: terms => [Příklad uživatelského povrchu nad jazykovým modelem.],
  citations: (bib.openai_chatgpt_macos,),
)
