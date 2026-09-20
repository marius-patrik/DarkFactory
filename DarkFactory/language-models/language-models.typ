#import "/DarkFactory/templates/common.typ": define-term, translation, term
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(
  id: "language-models-chatbots-agents",
  proper: translation(cs: "Jazykové modely, chatboti a agenti", en: "Language Models, Chatbots, and Agents"),
  keyword: false,
)

#let item = concept(
  key: "language_models",
  term: terminology,
  definition: terms => [
Tato skupina konceptů rozlišuje samotný jazykový model od produktových rozhraní a agentních systémů, které model používají.
  ],
  description: terms => [
#term(terms.language_model), #term(terms.chatbot) a #term(terms.agent) označují různé systémové vrstvy. Toto rozlišení zabraňuje zaměňování schopností modelu s funkcemi, které ve skutečnosti poskytuje aplikační nebo agentní harness.
  ],
  summary: terms => [
Další sekce proto popisují model, jeho bezprostřední inferenční mechanismy a nadřazené systémy odděleně.
  ],
  relations: ((type: "related", target: "language_model"), (type: "related", target: "chatbot"), (type: "related", target: "agent")),
)
