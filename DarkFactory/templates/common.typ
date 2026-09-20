// Shared manuscript semantics, independent of any concrete document template.
// Concrete templates consume this state/API; manuscript files import it through registry.typ.

#import "/DarkFactory/bib/references.typ": bib

#let body-paragraph(body) = block(breakable: true, body)
#let bullet-list(..items) = list(..items)
#let numbered-list(..items) = enum(..items)
#let paragraph = body-paragraph
#let bullets = bullet-list
#let numbered = numbered-list

#let review-state = state("review-mode", sys.inputs.at("review", default: "false") in ("true", "1", "yes"))
#let profile-state = state("publication-profile", "school")

#let is-review() = context review-state.get()
#let profile-mode() = context profile-state.get()

// Publikační profily:
// - school: český text a české section headings + canonical industry/proper terminology + bilingvní anotace/keywords
// - cs: čistě česká projekce
// - en: anglická projekce
// - merged: plně bilingvní projekce
#let bilingual(cs, en, stacked: true) = context {
  let profile = profile-state.get()
  if profile in ("school", "cs") {
    text(lang: "cs")[#cs]
  } else if profile == "en" {
    text(lang: "en")[#en]
  } else if stacked {
    block(breakable: true)[
      #text(lang: "cs")[#cs]
      #v(4pt)
      #text(lang: "en")[#en]
    ]
  } else {
    [#text(lang: "en")[#en] (#text(lang: "cs")[#cs])]
  }
}

#let localized = bilingual

#let ui-label(cs, en) = context {
  let profile = profile-state.get()
  if profile in ("school", "cs") {
    text(lang: "cs")[#cs]
  } else if profile == "en" {
    text(lang: "en")[#en]
  } else {
    [#text(lang: "cs")[#cs] | #text(lang: "en")[#en]]
  }
}


// Bilingvní hodnota je datový objekt, ne předem vysázený obsah. Stejná data lze
// použít v anotaci, názvech sekcí i dalších překládaných částech dokumentu.
#let translation(cs: none, en: none) = {
  assert(cs != none or en != none, message: "translation requires at least one language")
  (cs: cs, en: en)
}

#let resolve-language(language, profile, school-both: false) = {
  if language != "auto" {
    language
  } else if profile == "cs" {
    "cs"
  } else if profile == "en" {
    "en"
  } else if profile == "school" and not school-both {
    "cs"
  } else {
    "both"
  }
}

#let language-badge(code) = text(
  size: 8.5pt,
  weight: "bold",
  fill: rgb("#475569"),
)[[#code]]

#let pair-content(cs, en, separator: "bar", order: "cs-en") = {
  assert(separator in ("bar", "paren", "dash"), message: "separator must be bar, paren, or dash")
  assert(order in ("cs-en", "en-cs"), message: "order must be cs-en or en-cs")
  let first = if order == "cs-en" { cs } else { en }
  let second = if order == "cs-en" { en } else { cs }
  if separator == "paren" {
    [#first (#second)]
  } else if separator == "dash" {
    [#first — #second]
  } else {
    [#first | #second]
  }
}

#let render-translation(
  value,
  language: "auto",
  school-both: true,
  labels: false,
  stacked: true,
  spacing: 4pt,
  separator: "bar",
  order: "cs-en",
) = context {
  let lang = resolve-language(language, profile-state.get(), school-both: school-both)
  let part(code, body) = if labels {
    [#language-badge(code) #h(0.35em) #body]
  } else {
    body
  }
  assert(order in ("cs-en", "en-cs"), message: "translation order must be cs-en or en-cs")
  let has-cs = value.cs != none
  let has-en = value.en != none
  let cs = if has-cs { text(lang: "cs")[#part("CZ", value.cs)] } else { none }
  let en = if has-en { text(lang: "en")[#part("EN", value.en)] } else { none }

  if lang == "cs" {
    if has-cs { cs } else { en }
  } else if lang == "en" {
    if has-en { en } else { cs }
  } else if not has-cs {
    en
  } else if not has-en {
    cs
  } else {
    let first = if order == "cs-en" { cs } else { en }
    let second = if order == "cs-en" { en } else { cs }
    if stacked {
      block(breakable: true)[
        #first
        #v(spacing)
        #second
      ]
    } else {
      pair-content(cs, en, separator: separator, order: order)
    }
  }
}

#let translation-heading(
  value,
  language: "auto",
  school-both: true,
  separator: "bar",
  order: "cs-en",
) = render-translation(
  value,
  language: language,
  school-both: school-both,
  labels: false,
  stacked: false,
  separator: separator,
  order: order,
)

#let note(body) = context if review-state.get() {
  [#block(
    fill: rgb("ecfdf5"),
    stroke: (left: 3pt + rgb("10b981")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("065f46"), size: 10.5pt)[💡 *Návrh na vylepšení:* #body]
  ) <callout>]
} else {
  none
}

#let issue(body) = context if review-state.get() {
  [#block(
    fill: rgb("fef2f2"),
    stroke: (left: 3pt + rgb("ef4444")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("991b1b"), size: 10.5pt)[⚠️ *Chyba / Nesrovnalost k opravě:* #body]
  ) <callout>]
} else {
  none
}

#let alert(body) = context if review-state.get() {
  [#block(
    fill: rgb("fefce8"),
    stroke: (left: 3pt + rgb("eab308")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("854d0e"), size: 10.5pt)[📐 *Strukturální upozornění:* #body]
  ) <callout>]
} else {
  none
}

#let struct-alert = alert

#let critique(body) = context if review-state.get() {
  [#block(
    fill: rgb("fff7ed"),
    stroke: (left: 3pt + rgb("ea580c")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("9a3412"), size: 10.5pt)[🔥 *Hloubková kritika / Oponentura:* #body]
  ) <callout>]
} else {
  none
}

#let scope-note(body) = context if review-state.get() {
  [#block(
    fill: rgb("eff6ff"),
    stroke: (left: 3pt + rgb("3b82f6")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("1e40af"), size: 10.5pt)[📌 *Metodické vymezení / Rozsah práce:* #body]
  ) <callout>]
} else {
  none
}

#let blue-note = scope-note

// GitHub-style zelený diff pro nově přidaný text: zelené pozadí, tmavě zelený text a prefix "+"
#let added(body) = context if review-state.get() {
  highlight(fill: rgb("#dafbe1"))[
    #text(fill: rgb("#116329"))[[#text("+ ") <diff-prefix>]#body]
  ]
} else {
  body
}
#let ai = added

// Žlutý podtržený text pro neověřený text konceptu (draft / unconfirmed)
// V ne-revizní (raw) verzi se neověřený text zcela vynechává (none)
#let draft(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#eab308"), offset: 2.5pt)[#body]
} else {
  none
}
#let unconfirmed = draft

// Přijatý text: autor jej schválil a je součástí raw/final výstupu,
// ale stále může projít dalším začištěním. V review je modře podtržený.
#let accepted(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#2563eb"), offset: 2.5pt)[#body]
} else {
  body
}

// Finalizovaný text/struktura: považuje se za uzavřenou součást dokumentu.
// V review je zeleně podtržený; v raw/final verzi se vysází bez zvýraznění.
#let finalized(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#16a34a"), offset: 2.5pt)[#body]
} else {
  body
}

// GitHub-style červený diff pro odstraněný text: bez přeškrtnutí, červené pozadí, tmavě červený text a prefix "-"
#let removed(body) = context if review-state.get() {
  [#highlight(fill: rgb("#ffebe9"))[
    #text(fill: rgb("#82071e"))[#text("- ")#body]
  ] <removed-diff>]
} else {
  none
}

// Srovnávací diff je vždy návrh změny. Nová strana začíná jako unconfirmed:
// v review se zobrazí jako GitHub-style "+", současně žlutě podtržená;
// raw/final zachovává dosavadní (old) text. Po accepted/finalized se diff
// odstraní a ve zdroji zůstane pouze nový text v příslušném stavu.
#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(unconfirmed(new))]
} else {
  old
}

#let term-use-label = <thesis-term-use>

#let keyword-id(name) = "kw-" + lower(name).replace(regex("[^a-z0-9]+"), "-").trim("-")

// Konstruktor termínu. Výsledkem je plně přenositelná datová hodnota, kterou lze
// uložit do proměnné a libovolněkrát odkazovat s různým způsobem vykreslení.
#let define-term(
  proper: none,
  industry: none,
  alias: none,
  id: none,
  citation: none,
  source: none,
  keyword: true,
) = {
  assert(proper.cs != none or proper.en != none, message: "term requires at least one proper/formal name")
  let identity = if industry != none and industry.en != none {
    industry.en
  } else if proper.en != none {
    proper.en
  } else {
    proper.cs
  }
  let resolved-id = if id == none { keyword-id(str(identity)) } else { id }
  assert(resolved-id != "", message: "term id must not be empty")
  (
    kind: "term",
    id: resolved-id,
    proper: proper,
    industry: industry,
    alias: alias,
    citation: citation,
    source: source,
    keyword: keyword,
  )
}

#let resolve-citation-label(c) = {
  if c == none { none }
  else if type(c) == label { c }
  else if type(c) == str { label(c) }
  else if type(c) == dictionary and "citation" in c { resolve-citation-label(c.citation) }
  else if type(c) == dictionary and "label" in c { resolve-citation-label(c.label) }
  else { none }
}

#let term-source(value) = {
  assert(value.kind == "term", message: "term-source() expects a value created by define-term()")
  value.source
}

#let term-citation(value) = {
  assert(value.kind == "term", message: "term-citation() expects a value created by define-term()")
  value.citation
}

// Canonical naming roles:
//   industry — established industry-facing term or abbreviation,
//   proper   — formal localized name,
//   alias    — optional alternate name.
// The full surface is Industry (Proper) [Alias]. It never adds an English
// proper name merely because it differs from Czech; localization is controlled
// by the publication profile or the explicit language argument.
#let localized-name(value, language: "auto") = context {
  if value == none { return none }
  let profile = profile-state.get()
  let lang = if language != "auto" {
    language
  } else if profile in ("school", "cs") {
    "cs"
  } else if profile == "en" {
    "en"
  } else {
    "both"
  }

  if lang == "cs" {
    if value.cs != none { text(lang: "cs")[#value.cs] } else { text(lang: "en")[#value.en] }
  } else if lang == "en" {
    if value.en != none { text(lang: "en")[#value.en] } else { text(lang: "cs")[#value.cs] }
  } else if value.cs == none {
    text(lang: "en")[#value.en]
  } else if value.en == none or str(value.cs) == str(value.en) {
    text(lang: "cs")[#value.cs]
  } else {
    [#text(lang: "en")[#value.en] (#text(lang: "cs")[#value.cs])]
  }
}

#let raw-name(value, language: "auto") = context {
  if value == none { return none }
  let profile = profile-state.get()
  let lang = if language != "auto" { language } else if profile in ("school", "cs") { "cs" } else { "en" }
  if lang == "cs" {
    if value.cs != none { str(value.cs) } else { str(value.en) }
  } else {
    if value.en != none { str(value.en) } else { str(value.cs) }
  }
}

#let term-name(value, surface: "full", language: "auto") = context {
  assert(surface in ("full", "industry", "proper", "alias"), message: "term surface must be full, industry, proper, or alias")
  let industry = localized-name(value.industry, language: language)
  let proper = localized-name(value.proper, language: language)
  let alias = localized-name(value.alias, language: language)
  let industry-raw = raw-name(value.industry, language: language)
  let proper-raw = raw-name(value.proper, language: language)
  let alias-raw = raw-name(value.alias, language: language)

  if surface == "industry" {
    if industry != none { industry } else { proper }
  } else if surface == "proper" {
    proper
  } else if surface == "alias" {
    if alias != none { alias } else if industry != none { industry } else { proper }
  } else {
    let lead = if industry != none { industry } else { proper }
    let lead-raw = if industry != none { industry-raw } else { proper-raw }
    [
      #lead
      #if proper != none and proper-raw != lead-raw {
        [#h(0.25em)#text("(")#proper#text(")")]
      }
      #if alias != none and alias-raw != lead-raw and alias-raw != proper-raw {
        [#h(0.25em)#text("[")#alias#text("]")]
      }
    ]
  }
}

#let term-sort-name(value) = {
  if value.industry != none and value.industry.en != none {
    str(value.industry.en)
  } else if value.industry != none and value.industry.cs != none {
    str(value.industry.cs)
  } else if value.proper.en != none {
    str(value.proper.en)
  } else {
    str(value.proper.cs)
  }
}

// Jediný renderer všech použití termínu.
// Terms render names only. Concept definitions/descriptions own explanatory prose.
// surface vybírá industry/proper/alias/full; language určuje lokalizaci názvu.
#let term(
  value,
  render: "term",
  surface: "full",
  language: "auto",
  register: true,
  linked: false,
  marker: true,
  emphasized: true,
  cite: false,
) = context {
  assert(value.kind == "term", message: "term() expects a value created by define-term()")
  assert(render == "term", message: "term render supports the canonical term surface only")
  assert(surface in ("full", "industry", "proper", "alias"), message: "term surface must be full, industry, proper, or alias")
  assert(language in ("auto", "cs", "en", "both"), message: "term language must be auto, cs, en, or both")

  if register and value.keyword {
    [#metadata(value) #term-use-label]
  }

  let name = term-name(value, surface: surface, language: language)
  let displayed-name = if emphasized { [_*#name*_] } else { name }
  let displayed-name = if cite and value.citation != none {
    let render-c(c) = {
      let lbl = resolve-citation-label(c)
      if lbl != none { cite(lbl) } else { none }
    }
    let cites = if type(value.citation) == array {
      value.citation.map(render-c).filter(x => x != none).join()
    } else {
      render-c(value.citation)
    }
    if cites != none { [#displayed-name~#cites] } else { displayed-name }
  } else {
    displayed-name
  }
  // The standalone terminology index was removed. Keep the `linked` argument
  // for source compatibility, but canonical term uses now render in place.
  let referenced-name = displayed-name
  // Term markers are independent from the removed standalone terminology index.
  // Use a literal asterisk rather than the former star glyph.
  let with-marker = if marker and render != "explanation" {
    [#referenced-name#super[#text(fill: rgb("#2563eb"), size: 0.72em)[#text("*")]]]
  } else {
    referenced-name
  }
  with-marker
}

#let kw = term
#let render-term = term

#let collect-used-terms(entries) = {
  let items = ()
  for entry in entries {
    let value = entry.value
    if value.keyword and not items.any(item => item.id == value.id) {
      items.push(value)
    }
  }
  items.sorted(key: item => lower(term-sort-name(item)))
}

// Krátký dynamický seznam klíčových slov: pouze termíny skutečně použité
// v dané kompilaci, deduplikované podle stabilního id.
#let render-keywords() = context {
  let items = collect-used-terms(query(term-use-label))

  if items.len() == 0 {
    finalized[—]
  } else {
    finalized[
      #text(size: 11pt)[
        #items.map(item => term(
          item,
          render: "term",
          language: "auto",
          register: false,
          linked: false,
          marker: false,
          emphasized: false,
        )).join([, ])
      ]
    ]
  }
}
