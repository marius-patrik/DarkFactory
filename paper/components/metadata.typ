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

  title: "AI asistované softwarové inženýrství",
  practical-title: "DarkFactory",

  annotation-cs: [
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Cílem je vysvětlit, jak propojení jazykového modelu s nástroji, stavem, verifikací a lidskými kontrolními body umožňuje řízené provádění softwarových úloh v praxi. Agentické inženýrství práce vymezuje jako soubor postupů, které činí AI-asistovaný vývoj účinným, kontrolovaným, opakovatelným a škálovatelným. Teoretická část vychází z odborných publikací a dokumentace nástrojů. Praktická část implementuje jednoduchou produkční pipeline DarkFactory, v níž je GitHub vývojovým prostředím, GitHub Actions výpočetním prostředím, kontejner izolační vrstvou a GitHub Issues stavovým systémem. Je popsáno přijetí a plánování požadavku, lidské schválení, izolovaná implementace na větvi, automatická review smyčka, zpětná vazba, merge a odstranění větve. Výsledky ukazují, že praktická autonomie vzniká především rozdělením odpovědnosti mezi model, harness, GitHub a člověka.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic development and the role of the harness as the runtime and integration environment of a coding agent. Its objective is to explain how connecting a language model to tools, state, verification, and human control points enables the controlled execution of software tasks in practice. Agentic Engineering is defined as a set of practices that make AI-assisted development efficient, controlled, repeatable, and scalable. The theoretical part is based on academic publications and tool documentation. The practical part implements a simple production pipeline, DarkFactory, in which GitHub is the development environment, GitHub Actions is the execution environment, a container provides isolation, and GitHub Issues serves as the state system. It describes request intake and planning, human approval, isolated implementation on a branch, an automatic review loop, feedback, merging, and branch deletion. The findings indicate that practical autonomy arises primarily from the division of responsibility among the model, the harness, GitHub, and the human.
  ],
)
