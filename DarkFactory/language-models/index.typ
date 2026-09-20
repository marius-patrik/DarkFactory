#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/language-models/language-models.typ" as section
#import "/DarkFactory/language-models/chatbot.typ" as chatbot
#import "/DarkFactory/language-models/agent.typ" as agent
#import "/DarkFactory/language-models/language-model/index.typ" as language_model

#let node = folder(
  key: "language_models",
  section: section.item,
  concepts: (chatbot.item, agent.item),
  children: (language_model.node,),
)
