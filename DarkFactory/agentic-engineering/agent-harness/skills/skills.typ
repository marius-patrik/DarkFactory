#import "/DarkFactory/templates/common.typ": translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "skills",
    industry: "Skills",
  czech: "Dovednosti",
  english: "Skills",
  citation: bib.anthropic2024tooluse,
  source: bib.anthropic2024tooluse,
definition: terms => [
Dovednost je znovupoužitelný modulární balíček instrukcí, procedurálních pravidel a volitelných skriptů či zdrojů, který harness načítá podle povahy řešeného úkolu.
  ],
  description: terms => [
Se vzrůstající komplexitou úloh nelze veškeré instrukce, skripty a doménové znalosti vkládat do základního systémového promptu. K modulárnímu rozšíření schopností agenta slouží #diff[#term(terms.skills).][#term(terms.skills) @anthropic2024tooluse.]

Architektura dovedností staví na následujících principech:
- Definiční soubor `SKILL.md`: Dovednost tvoří adresář obsahující definiční soubor se strukturovanou hlavičkou (YAML frontmatter vymezující název a popis role) a detailním návodem k použití.
#diff[
- Dynamické načítání pro úsporu kontextu: Do výchozího promptu se vloží pouze stručný přehled dostupných dovedností. Kompletní instrukce a skripty se do kontextu načtou až v okamžiku, kdy agent danou dovednost explicitně vyvolá.
- Skripty (#term(terms.script, language: "en", marker: false, linked: false, emphasized: false)) a záchytné body (#term(terms.hook, language: "en", marker: false, linked: false, emphasized: false)): Dovednosti mohou obsahovat deterministické skripty pro rutinní transformace kódu a událostní háčky vyvolávané při stavových přechodech harnessu.

Kromě kontextových dovedností využívají pokročilé řídicí architektury také programové #term(terms.plugins). Zatímco _Skills_ fungují jako kontextové procedury a instrukce interpretované modelem, pluginy rozšiřují samotný harness na nativní systémové úrovni.
][
Načítání dovedností popisuje samostatný koncept #term(terms.progressive_disclosure). Deterministické součásti dovedností jsou rozděleny mezi #term(terms.script) a #term(terms.hook); nativní rozšíření harnessu představuje samostatný koncept #term(terms.plugins).
]
  ],
  summary: terms => [
Dovednosti modularizují doménové postupy a načítají je pouze tehdy, když jsou relevantní, čímž snižují velikost základního promptu a omezují duplicitu instrukcí.
  ],
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "tool_calling"),),
)