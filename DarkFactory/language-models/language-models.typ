#import "/DarkFactory/templates/common.typ": term
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "language_models",
  czech: "Jazykové modely, chatboti a agenti",
  english: "Language Models, Chatbots, and Agents",
  definition: terms => [
Jazykový model, chatbot a agent jsou odlišné systémové vrstvy.
  ],
  description: terms => [
#term(terms.language_model) provádí inferenci, #term(terms.chatbot) přidává konverzační aplikační vrstvu a #term(terms.agent) navíc samostatně jedná pomocí nástrojů.
  ],
  relations: ((type: "related", target: "language_model"), (type: "related", target: "chatbot"), (type: "related", target: "agent")),
)
