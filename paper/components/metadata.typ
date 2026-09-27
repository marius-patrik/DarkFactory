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

  title: "Vzrůst Agentického AI: úvod do agentického inženýrství a implementace software factory",
  practical-title: "DarkFactory",

  annotation-cs: [
Práce představuje agentickou umělou inteligenci jako poslední krok přechodu od konverzační asistence k delegovanému vývoji a vymezuje pojem agentického inženýrství. Ukazuje, že jádrem této disciplíny není schopnost jazykového modelu, ale návrh systému, v němž model pracuje, a že pojem software factory, zavedený již v roce 1968, zažívá právě prostřednictvím agentů znovu. Výzkumná otázka zní, které principy musí agentický systém splnit, aby vykonával inženýrskou práci. Hypotéza, kterou práce v praktické části ověřuje, na ni odpovídá: praktická autonomie je vlastností návrhu systému, který práci řídí, a nikoli vlastností modelu, který v něm pracuje. Praktická část popisuje DarkFactory, záměrně minimální produkční softwareovou továrnu, v níž je GitHub vývojovým prostředím i trvalým stavem a pythonovský řadič spolu s produkčními harnessy realizuje interpretaci, plánování, implementaci, revizi a integraci změn. Strukturu, která práci řídí, navrhuje autor sám. Úsudek o tom, co je v jednotlivém kroku správné, však přebírá od smyčky, kterou nevlastní — a právě v tomto rozdílu leží hranice, za kterou teprve vlastní harness pomůže.
  ],
  abstract-en: [
This thesis presents agentic artificial intelligence as the latest step in the transition from conversational assistance to delegated development, and establishes the term agentic engineering. It argues that the core of the discipline is not the capability of a language model but the design of the system in which the model operates, and that software factory, a concept introduced in 1968, is being revived precisely through agents. The research question asks which principles an agentic system must satisfy in order to perform engineering work, and the hypothesis tested in the practical part answers it: practical autonomy is a property of the design of the system that governs the work, not of the model operating inside it. The practical part describes DarkFactory, a deliberately minimal production software factory in which GitHub is the development environment and the durable state, GitHub Actions the execution environment, a container the isolation layer, and a Python runner working with production harnesses performs intake, planning, implementation, review and integration. The structure that governs the work is the author's own; the judgement of what is correct in any single step is taken over from a loop he does not own — and beyond that difference lies the boundary that only a harness of one's own helps to cross.
  ],
)
