#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/chatgpt.typ" as chatgpt


#let item = concept(
  key: "chatbot",
    czech: "Chatbot",
  english: "Chatbot",
  citation: bib.wooldridge1995,
  source: bib.wooldridge1995,
definition: terms => [Chatbot je aplikační systém, který zpřístupňuje jazykový model prostřednictvím konverzační interakce.],
  description: terms => [Chatbot může k modelu přidat historii konverzace, multimodální vstupy, soubory, webové vyhledávání a další nástroje; tyto funkce patří aplikační vrstvě.],
  examples: (chatgpt.item,),
  relations: ((type: "dependency", target: "language_model"),)
)
