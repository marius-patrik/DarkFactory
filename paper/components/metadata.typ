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
  keywords-cs: ("coding agenti", "harness", "softwarová továrna", "orchestrace", "generativní AI"),
  keywords-en: ("coding agents", "harness", "software factory", "orchestration", "generative AI"),

  annotation-cs: [
    Práce se zabývá současným agentickým inženýrstvím ve vývoji softwaru. S rostoucími
    schopnostmi a adopcí generativní AI se rozšiřují možnosti agentů pro vývoj softwaru, jejich praktické
    využití je však stále méně rozšířené než běžné používání chatbotů. Cílem práce je popsat
    a systematizovat principy současného agentického inženýrství a na systému DarkFactory
    ukázat, co jejich propojení umožňuje v praxi.

    Teoretická část vysvětluje vztah mezi jazykovým modelem, agentem a agentní vrstvou a
    shrnuje práci s kontextem, nástroji, trvalým stavem, specifikací, orchestrací,
    programovým ověřováním a lidskými rozhodovacími body. Popisuje také současnou podobu
    softwarové továrny, v níž jsou agenti začleněni do běžného repozitářového procesu.

    Praktická část má podobu inženýrské případové studie DarkFactory, záměrně jednoduché
    agentické softwarové továrny nativně postavené na GitHubu. Systém byl implementován
    pomocí komerčních agentů. Již v této podobě dokáže agenty sám spouštět a řídit
    a vytváří základ pro další rozvoj stejným procesem.

    Studie ukazuje, že praktický agentický proces vzniká kombinací modelového úsudku
    s trvalým stavem mimo model, programovou orchestrací, deterministickými kontrolami a
    lidskými branami. Současně odhaluje omezení počáteční implementace, zejména u modelové
    revize, opakování verifikace a změn schváleného rozsahu. Přínosem práce je systematizace
    těchto principů a ukázka jejich konkrétní realizace v jednom produkčním vývojovém procesu.
  ],
  abstract-en: [
    The thesis addresses contemporary agentic engineering in software development. As the
    capabilities and adoption of generative AI grow, the possibilities of coding agents also
    expand, but their practical use remains less widespread than ordinary chatbot use. The aim
    of the thesis is to describe and systematize the principles of contemporary agentic
    engineering and, using DarkFactory, show what their combination enables in practice.

    The theoretical part explains the relationship between the language model, the agent, and
    the harness layer and summarizes work with context, tools, durable state, specification,
    orchestration, programmatic verification, and human decision points. It also describes the
    contemporary form of the software factory, in which coding agents are integrated into
    ordinary repository workflows.

    The practical part takes the form of an engineering case study of DarkFactory, a deliberately
    simple agentic software factory built natively on GitHub. The system was implemented using
    commercial coding agents. Even in this initial form, it can already launch and manage agents
    itself and creates a foundation for further development using the same process.

    The study shows that a practical agentic workflow arises from combining model judgment with
    durable state outside the model, programmatic orchestration, deterministic checks, and human
    gates. At the same time, it reveals limitations of the initial implementation, particularly
    in model-based review, repeated verification, and changes to the approved scope. The
    contribution of the thesis is the systematization of these principles and a demonstration of
    their concrete implementation in a single production development process.
  ],
)
