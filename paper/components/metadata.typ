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
    Práce zkoumá přechod od konverzační asistence k delegovanému agentnímu vývoji a roli harnessu jako běhového a integračního prostředí coding agenta. Cílem je vysvětlit, jak propojení jazykového modelu s nástroji, stavem, verifikací a lidskými kontrolními body umožňuje řízené provádění softwarových úloh v praxi. Práce přitom vymezuje pojem agentické inženýrství, který dosud nemá v češtině ustálené označení, a odlišuje jej od příbuzného výrazu pro vlastnost samotného agenta. Teoretická část vychází z odborných publikací a z dokumentace nástrojů. Praktická část implementuje jednoduchou produkční pipeline DarkFactory, v níž je GitHub vývojovým prostředím, GitHub Actions výpočetním prostředím, kontejner izolační vrstvou a GitHub Issues stavovým systémem. Je popsáno přijetí a plánování požadavku, lidské schválení, izolovaná implementace na větvi, automatická review smyčka, zpětná vazba, merge a odstranění větve. Výsledky ukazují, že praktická autonomie vzniká především rozdělením odpovědnosti mezi model, harness, GitHub a člověka, a že tato struktura zůstává invariantní vůči volbě konkrétního nástroje. Přínosem práce je popis této struktury jako souboru postupů, které lze převzít i mimo DarkFactory.
  ],
  abstract-en: [
    This thesis examines the transition from conversational assistance to delegated agentic development and the role of the harness as the runtime and integration environment of a coding agent. Its objective is to explain how connecting a language model to tools, state, verification, and human control points enables the controlled execution of software tasks in practice. The thesis also establishes the term agentic engineering, which has no settled Czech equivalent, and distinguishes it from the related term for a property of the agent itself. The theoretical part is based on academic publications and tool documentation. The practical part implements a simple production pipeline, DarkFactory, in which GitHub is the development environment, GitHub Actions is the execution environment, a container provides isolation, and GitHub Issues serves as the state system. It describes request intake and planning, human approval, isolated implementation on a branch, an automatic review loop, feedback, merging, and branch deletion. The findings indicate that practical autonomy arises primarily from the division of responsibility among the model, the harness, GitHub, and the human, and that this structure remains invariant to the choice of a particular tool. The contribution of the work is a description of that structure as a set of practices that can be adopted outside DarkFactory as well.
  ],
)
