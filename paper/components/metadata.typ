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
    Práce zkoumá, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci —
    tedy změnu repozitáře, kterou může přezkoumat a sloučit člověk, který agenta na nic nepožádal.
    Předpokládá přitom, že praktická autonomie je vlastností návrhu systému, který práci řídí, a
    nikoli vlastností modelu, který v něm pracuje.

    Praktická část popisuje DarkFactory, produkční pipeline pro AI-asistovaný softwarový vývoj,
    kterou napsaly komerční coding agenty a která nyní sama provozuje. GitHub slouží zároveň jako
    vývojové prostředí a jako trvalý stav, události z něj spouštějí agentní kroky v izolovaném
    kontejneru a harness poskytuje model, nástroje a pozorování. Požadavek tak vede od issue
    přes lidsky schválený plán ke sloučenému pull requestu.

    Z tohoto posoupání vychází, že spolehlivost nesídlí v modelu: každý krok, na kterém stojí krok
    následující, je zapisován mimo konverzaci, a dvě rozhodnutí před vznikem větve patří člověku.
    Plán i výsledný diff se však posuzují až dotazem na model, takže posouzení je právě v tomto
    úseku nejisté. Popsaná konfigurace neudržuje všechny hranice — schválený plán není hranicí
    rozsahu a poslední brána neověřuje oprávnění v repozitáři.
  ],
  abstract-en: [
    This thesis asks under what conditions an agentic system performs engineering work
    reliably — that is, a change to a repository that a person who has not asked the agent
    anything can review and merge. It assumes that practical autonomy is a property of the
    design of the system that directs the work, not a property of the model operating in it.

    The practical part describes DarkFactory, a production pipeline for AI-assisted software
    development, written by commercial coding agents, which it now operates itself. GitHub
    serves as both the development environment and the durable state; its events trigger
    agentic steps in an isolated container, and a harness supplies the model, the tools and
    the observations. A request therefore travels from an issue through a human-approved plan
    to a merged pull request.

    Reading that sequence, reliability does not reside in the model: every step the next one
    depends on is written outside the conversation, and the two decisions taken before the
    branch exists belong to a person. The plan and the resulting diff are, however, judged
    by asking a model, so the assessment is least certain in that stretch. The configuration
    described does not hold every boundary — the approved plan is not a boundary of scope,
    and the final gate checks no permission.
  ],
)
