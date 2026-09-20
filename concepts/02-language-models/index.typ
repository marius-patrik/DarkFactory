#import "../schema.typ": folder
#import "language-models.typ" as section
#import "chatbot.typ" as chatbot
#import "agent.typ" as agent
#import "language-model/index.typ" as language_model

#let node = folder(
  key: "language_models",
  section: section.item,
  concepts: (chatbot.item, agent.item),
  children: (language_model.node,),
)
