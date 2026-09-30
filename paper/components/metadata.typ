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
    Práce zkoumá, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci,
    tedy změnu repozitáře, kterou může přezkoumat a sloučit člověk, který nemusí agenta
    obsluhovat ručně. Předpokládá přitom, že praktická autonomie agentického systému není dána pouze schopnostmi modelu, ale především návrhem systému, který řídí stav, nástroje, rozhodovací brány a integraci výsledku.

    Práce vymezuje kratkou historii nástrojů založených na jazykových modelech, vysvětluje, co
    agent je a jak funguje, a popisuje principy agentického inženýrství, tedy praktiky pro
    spolehlivou inženýrskou práci pomocí agentických systémů. Jazykový model je sám o sobě jen
    funkcí; agent vzniká až propojením s nástroji, prostředím a stavem.

    Praktická část představuje DarkFactory, produkční pipeline pro AI-asistovaný softwarový
    vývoj. Tu napsaly komerční coding agenty. DarkFactory je nyní sama provozuje: události GitHubu
    spouštějí agentní kroky v izolovaném kontejneru a požadavek vede od issue přes lidsky schválený
    plán ke sloučenému pull requestu. Harness poskytuje modelu nástroje a pozorování, zatímco
    runner převádí událost na agentní krok. Stav běhu leží v repozitáři, nikoli v konverzaci
    s modelem.
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
