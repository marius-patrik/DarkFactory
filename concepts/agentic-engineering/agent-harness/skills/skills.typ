#import "../../../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../../../schema.typ": concept

#let terminology = define-term(
    id: "skills",
    proper: translation(cs: "Dovednosti", en: "Skills"),
    industry: translation(cs: "Skills", en: "Skills"),
    default-name-type: "both",
    keyword-name-type: "both",
    explanation_cs: "Znovupoužitelné modulární balíčky instrukcí (typicky definovaných v souboru SKILL.md), procedurálních pravidel a volitelných pomocných skriptů či zdrojů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.",
    explanation_en: "Reusable modular packages of instructions (typically defined in a SKILL.md file), procedural rules, and optional helper scripts or resources that a harness dynamically loads into an agent's context for a particular class of task.",
  )

#let item = concept(
  key: "skills",
  term: terminology,
  heading: terms => [#finalized[#term(terms.skills, name-separator: "paren", name-order: "cs-en", marker: false, linked: false, emphasized: false)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
Se vzrůstající komplexitou úloh nelze veškeré instrukce, skripty a doménové znalosti vkládat do základního systémového promptu. K modulárnímu rozšíření schopností agenta slouží #term(terms.skills, render: "both", detail-language: "cs", detail-style: "inline").

Architektura dovedností staví na následujících principech:
- Definiční soubor `SKILL.md`: Dovednost tvoří adresář obsahující definiční soubor se strukturovanou hlavičkou (YAML frontmatter vymezující název a popis role) a detailním návodem k použití.
- Dynamické načítání pro úsporu kontextu: Do výchozího promptu se vloží pouze stručný přehled dostupných dovedností. Kompletní instrukce a skripty se do kontextu načtou až v okamžiku, kdy agent danou dovednost explicitně vyvolá.
- Skripty (#term(terms.script, language: "en", marker: false, linked: false, emphasized: false)) a záchytné body (#term(terms.hook, language: "en", marker: false, linked: false, emphasized: false)): Dovednosti mohou obsahovat deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.

Kromě kontextových dovedností využívají pokročilé řídicí architektury také programové #term(terms.plugins, render: "both", detail-language: "cs", detail-style: "inline"). Zatímco _Skills_ fungují jako kontextové procedury a instrukce interpretované modelem, pluginy rozšiřují samotný harness na nativní systémové úrovni.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: finalized,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: ((type: "dependency", target: "tool_calling"),)
)
