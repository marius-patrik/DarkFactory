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
Práce představuje agentickou umělou inteligenci jako poslední krok v přechodu od konverzační asistence k delegovanému vývoji a vymezuje pojem agentického inženýrství, který dosud nemá v češtině ustálené označení. Ukazuje, že jádrem této disciplíny není schopnost jazykového modelu, ale návrh systému, v němž model pracuje, a že pojem software factory, zavedený již v roce 1968, zažívá právě prostřednictvím agentů znovu. Z výzkumné otázky, zda je řízená autonomie dosažitelná bez vlastního harnessu, vychází hypotéza, která je v praktické části ověřována. Ta popisuje DarkFactory, záměrně jednoduchou produkční softwareovou továrnu, v níž je GitHub vývojovým prostředím a místem trvalého stavu, GitHub Actions výpočetním prostředím, kontejner izolačním prostředím a pythonovský řadič ve spolupráci s produkčními harnessy realizuje interpretaci, plánování, implementaci, revizi a integraci změn. Hypotéza se potvrzuje: autonomie je dosažitelná i bez vlastního harnessu, její struktura je vůči volbě nástroje invariantní, její kvalita však zůstává omezena kvalitou cizí smyčky. Význam práce spočívá v tom, že ukazuje cestu k řízenému předávání práce bez nutnosti psát si vlastní nástroj, což je právě podmínka, která dnes širšímu nasazení brání.
  ],
  abstract-en: [
This thesis presents agentic artificial intelligence as the latest step in the transition from conversational assistance to delegated development, and establishes the term agentic engineering, which has no settled Czech equivalent. It argues that the core of the discipline is not the capability of a language model but the design of the system in which the model operates, and that software factory, a concept introduced in 1968, is being revived precisely through agents. The research question — whether controlled autonomy is reachable without an in-house harness — yields a hypothesis that the practical part then tests. That part describes DarkFactory, a deliberately simple production software factory in which GitHub is the development environment and the durable state, GitHub Actions the execution environment, a container the isolation layer, and a Python runner working with production harnesses performs intake, planning, implementation, review and integration. The hypothesis is confirmed: autonomy is reachable without an in-house harness and its structure is invariant to the choice of tool, while its quality remains bounded by the quality of a third-party loop the author does not control.
  ],
)
