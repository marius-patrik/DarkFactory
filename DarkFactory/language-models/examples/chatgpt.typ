#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#import "chatgpt-image.typ" as screenshot

#let terminology = define-term(
  id: "chatgpt",
  proper: translation(cs: "ChatGPT", en: "ChatGPT"),
  industry: translation(cs: "ChatGPT", en: "ChatGPT"),
  keyword: false,
)

#let item = concept(
  key: "chatgpt",
  term: terminology,
  definition: terms => [ChatGPT je konverzační produkt OpenAI zpřístupňující modely prostřednictvím chatového a aplikačního rozhraní.],
  description: terms => [Jako příklad chatbota odděluje modelovou vrstvu od uživatelského produktu: rozhraní přidává práci se soubory, obrazem, webem a dalšími nástroji, které samotný model neposkytuje.],
  summary: terms => [ChatGPT ilustruje rozdíl mezi jazykovým modelem a aplikačním systémem, který model obaluje.],
  attachments: (screenshot.item,),
  citations: (bib.openai_chatgpt_macos,),
  relations: ((type: "related", target: "chatbot"),)
)
