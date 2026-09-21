#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "chatgpt-image.typ" as screenshot


#let item = concept(
  key: "chatgpt",
    industry: "ChatGPT",
  czech: "ChatGPT",
  english: "ChatGPT",
definition: terms => [ChatGPT je konverzační produkt OpenAI zpřístupňující modely prostřednictvím chatového a aplikačního rozhraní.],
  description: terms => [Rozhraní ChatGPT přidává k modelové vrstvě práci se soubory, obrazem, webem a dalšími nástroji.],
  attachments: (screenshot.item,),
  citations: (bib.openai_chatgpt_home,),
  relations: ((type: "related", target: "chatbot"),)
)
