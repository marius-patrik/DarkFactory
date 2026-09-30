// Document metadata: the facts printed on the title page, in the declaration and in
// the annotation.
//
// It is a component, because several pages read from it, and it sits in ./components
// for that reason. It is not a style, so it is not one of the modules in ../styles:
// a style is a rule that shapes how the document looks or breaks, and the author of a
// thesis is not one of those, neither is its abstract. Metadata is data. Changing a
// name or a date therefore touches a fact, not a rule, and no styles file has to be
// edited to correct a typo on the title page.

#let meta = (
  author: "Patrik Marius",
  class: "4.D",
  supervisor: "Michal Dočekal",
  school: "Gymnázium J. K. Tyla",
  school-short: "GJKT",
  city: "Hradci Králové",
  year: 2026,

  title: "Agentické inženýrství ve vývoji softwaru",
  subtitle: "Návrh a implementace DarkFactory",
  practical-title: "DarkFactory",

  annotation-cs: [
    Práce se zabývá současným agentickým inženýrstvím ve vývoji softwaru. S rostoucími
    schopnostmi a adopcí generativní AI se rozšiřují i možnosti coding agentů, jejich praktické
    využití je však stále méně rozšířené než běžné používání chatbotů. Cílem práce je proto
    popsat a systematizovat principy současného agentického inženýrství a na systému DarkFactory
    ukázat, co jejich propojení umožňuje v praxi.

    Teoretická část vysvětluje vztah mezi jazykovým modelem, agentem a harness vrstvou a
    shrnuje práci s kontextem, nástroji, trvalým stavem, orchestrací, ověřováním a lidskými
    rozhodovacími body.

    Praktická část má podobu případové studie systému DarkFactory, agentické softwarové továrny
    nativně postavené na GitHubu. DarkFactory řídí práci coding agentů od přijetí požadavku přes
    jeho interpretaci, plánování a implementaci až po revizi a lidské schválení výsledku.

    Studie ukazuje, že jazykový model je pouze jednou částí širšího systému. Okolní vrstvy
    zajišťují stav, nástroje, pořadí kroků, programové kontroly a rozhodovací brány. Přínosem
    práce je systematizace těchto principů a ukázka jejich konkrétní realizace, včetně omezení
    zvoleného návrhu.
  ],
  abstract-en: [
    The thesis asks under what conditions an agentic system performs engineering work
    reliably — that is, a change to a repository that a person who need not operate the
    agent by hand can review and merge. It assumes that practical autonomy in an agentic system is not determined solely by the model's
    capabilities, but above all by the design of the system that governs state, tools,
    decision gates and the integration of the result.

    The thesis sets out the short history of tools built on language models, explains what
    an agent is and how it works, and describes the principles of agentic engineering, that
    is, the practices for reliable engineering work with the help of agentic systems. A
    language model is by itself only a function; an agent comes into being only once it is
    connected to tools, an environment and state.

    The practical part presents DarkFactory, a production pipeline for AI-assisted software
    development. Commercial coding agents wrote it. DarkFactory now operates those agents
    itself: GitHub events trigger agentic steps in an isolated container, and a request
    travels from an issue through a human-approved plan to a merged pull request. A harness
    supplies the model with tools and observations, while a runner turns an event into one
    agentic step. The state of a run lies in the repository, not in the conversation with the
    model.
  ],
)
