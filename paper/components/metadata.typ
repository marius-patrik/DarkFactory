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
    The thesis deals with contemporary agentic engineering in software development. As the
    capabilities and adoption of generative AI grow, so do the possibilities of coding agents,
    but their practical use is still less widespread than the ordinary use of chatbots. The aim
    of the thesis is therefore to describe and systematize the principles of contemporary agentic
    engineering and, using DarkFactory, to show what their combination enables in practice.

    The theoretical part explains the relationship between the language model, the agent, and
    the harness layer, and summarizes work with context, tools, durable state, orchestration,
    verification, and human decision points.

    The practical part takes the form of a case study of DarkFactory, an agentic software factory
    built natively on GitHub. DarkFactory manages the work of coding agents from receiving a
    request through its interpretation, planning, and implementation to review and human
    approval of the result.

    The study shows that the language model is only one part of a broader system. The surrounding
    layers provide state, tools, the ordering of steps, programmatic checks, and decision gates.
    The contribution of the thesis is the systematization of these principles and a demonstration
    of their concrete implementation, including the limitations of the chosen design.
  ],
)
