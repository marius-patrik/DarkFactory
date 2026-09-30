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
    Práce se zabývá otázkou, za jakých podmínek agentický systém spolehlivě vykonává
    inženýrskou práci. Inženýrskou prací zde chápe změnu repozitáře, kterou může přezkoumat
    a sloučit člověk, který agenta na nic nepožádal. Předpokládala přitom, že praktická
    autonomie je vlastností návrhu systému, který práci řídí, a nikoli vlastností modelu,
    který v něm pracuje.

    V praktické části byla implementována produkční pipeline DarkFactory. Napsaly ji
    komerční coding agenty, které následně sama provozuje. Události GitHubu spouštějí
    agentní kroky v izolovaném kontejneru, kde harness poskytuje model, nástroje a
    pozorování. Požadavek tak vede od issue přes lidsky schválený plán až ke sloučenému
    pull requestu.

    Z tohoto posoupání vychází, že spolehlivost nesídlí v modelu. Každý krok, na kterém
    stojí krok následující, je zapisován mimo konverzaci, a dvě rozhodnutí před vznikem
    větve patří člověku. Model je v tomto systému položka konfigurace: harness je zapsán
    deklarativně, v registru je osm harnessů v konfigurovatelném pořadí a chybějící binář
    se přeskočí. Plán i výsledný diff se však posuzují až dotazem na model. Hypotéza se
    potvrdila. Popsaná konfigurace ale neudržuje všechny hranice: schválený plán není
    hranicí rozsahu a poslední brána neověřuje oprávnění. Pro další výzkum zůstává ověřit
    přenos podmínek na jiný repozitář a jinou sadu modelů.
  ],
  abstract-en: [
    The work asks under what conditions an agentic system performs engineering work
    reliably. Engineering work is taken to be a change to a repository that a person other
    than its author can review and merge without asking the agent anything. It assumes that
    practical autonomy is a property of the system's design, not of the model that operates
    in it.

    The practical part implements the production pipeline DarkFactory. Commercial coding
    agents wrote it, and DarkFactory now operates them. GitHub events trigger agentic steps
    in an isolated container, where a production harness supplies the model, the tools and
    the observations. A request therefore travels from an issue through a human-approved
    plan to a merged pull request.

    Reading that sequence step by step, reliability does not reside in the model. Every
    step the next one depends on is written outside the conversation, and the two decisions
    taken before the branch exists belong to a person. The model is a configuration value
    here: the harness is declarative, eight harnesses are registered in a configurable
    order, and a missing binary is skipped. Both the plan and the resulting diff are,
    however, judged by asking a model. The hypothesis is confirmed. The configuration does
    not hold every boundary: the approved plan is not a boundary of scope, and the final
    gate checks no permission. Further research should test whether these conditions
    transfer to another repository and another set of models.
  ],
)
