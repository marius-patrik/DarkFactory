#import "/DarkFactory/templates/common.typ": define-term, translation, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/chatgpt.typ" as chatgpt

#let terminology = define-term(
  id: "chatbot",
  proper: translation(cs: "Chatbot", en: "Chatbot"),
  citation: bib.wooldridge1995,
  source: bib.wooldridge1995,
)

#let item = concept(
  key: "chatbot",
  term: terminology,
  definition: terms => [Chatbot je aplikační systém, který zpřístupňuje jazykový model prostřednictvím konverzační interakce.],
  description: terms => [Na rozdíl od samotného modelu může chatbot přidávat historii konverzace, multimodální vstupy, práci se soubory, webové vyhledávání nebo další nástroje. Tyto funkce patří aplikační vrstvě, nikoli modelu samotnému.],
  summary: terms => [Chatbot je produktová vrstva nad modelem; agentní systém se od něj odlišuje především řízenou prováděcí smyčkou a schopností samostatně vykonávat akce.],
  examples: (chatgpt.item,),
  relations: ((type: "dependency", target: "language_model"),)
)
