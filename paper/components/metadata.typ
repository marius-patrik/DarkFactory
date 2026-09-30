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

  // STUBBED by author, pending the §3.2-3.5 rewrite.
  //
  // Both fields are stale and cannot be lightly patched:
  //   - both still quote the pre-R15 research question, "které principy musí
  //     agentický systém splnit". The question now reads "Za jakých podmínek
  //     agentický systém spolehlivě vykonává inženýrskou práci?" (3e89f4a7).
  //   - both describe the practical part in terms §3.2-3.5 are about to change.
  //   - the Czech one sits at 160 words against a 150-250 limit; it must be
  //     rewritten inside that range, not padded to it.
  // Author's instruction: rewrite these together with the outro and the citation
  // pass, at the end. Do not restore earlier text.
  annotation-cs: [
STUB
  ],
  abstract-en: [
STUB
  ],
)
