// Shared manuscript semantics, independent of any concrete document template.
// Concrete templates consume this state/API; manuscript files import it through registry.typ.

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
// - school: český text + hlavní anglické odborné termíny + bilingvní anotace/keywords
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
  id: none,
  explanation_en: none,
  explanation_cs: none,
  keyword: true,
  default-name-type: "proper",
  keyword-name-type: none,
) = {
  assert(proper.cs != none or proper.en != none, message: "term requires at least one proper/formal name")
  assert(default-name-type in ("proper", "industry", "both"), message: "default term name type must be proper, industry, or both")
  if industry == none {
    assert(default-name-type != "industry", message: "industry default requires an industry name")
  }
  let identity = if proper.en != none { proper.en } else { proper.cs }
  let resolved-id = if id == none { keyword-id(str(identity)) } else { id }
  let resolved-keyword-type = if keyword-name-type == none { default-name-type } else { keyword-name-type }
  assert(resolved-id != "", message: "term id must not be empty")
  assert(resolved-keyword-type in ("proper", "industry", "both"), message: "keyword term name type must be proper, industry, or both")
  (
    kind: "term",
    id: resolved-id,
    proper: proper,
    industry: industry,
    explanation_en: explanation_en,
    explanation_cs: explanation_cs,
    keyword: keyword,
    default_name_type: default-name-type,
    keyword_name_type: resolved-keyword-type,
  )
}

#let term-language(language, profile) = {
  if language != "auto" {
    language
  } else if profile == "cs" {
    "cs"
  } else if profile == "en" {
    "en"
  } else {
    "both"
  }
}

#let term-proper-name(value, language: "auto") = context {
  let lang = term-language(language, profile-state.get())
  let cs = value.proper.cs
  let en = value.proper.en

  if lang == "cs" {
    if cs != none { text(lang: "cs")[#cs] } else { text(lang: "en")[#en] }
  } else if lang == "en" {
    if en != none { text(lang: "en")[#en] } else { text(lang: "cs")[#cs] }
  } else if cs == none {
    text(lang: "en")[#en]
  } else if en == none {
    text(lang: "cs")[#cs]
  } else if str(cs) == str(en) {
    text(lang: "en")[#en]
  } else {
    [
      #text(lang: "cs")[#cs]
      #h(0.25em)
      #text("[")
      #text(lang: "en")[#en]
      #text("]")
    ]
  }
}

#let term-industry-name(value, language: "auto") = context {
  if value.industry == none {
    none
  } else {
    let lang = term-language(language, profile-state.get())
    let cs = value.industry.cs
    let en = value.industry.en

    if lang == "cs" {
      if cs != none { text(lang: "cs")[#cs] } else { text(lang: "en")[#en] }
    } else if lang == "en" {
      if en != none { text(lang: "en")[#en] } else { text(lang: "cs")[#cs] }
    } else if en != none {
      text(lang: "en")[#en]
    } else {
      text(lang: "cs")[#cs]
    }
  }
}

#let industry-name-redundant(value) = {
  if value.industry == none {
    true
  } else {
    let proper-values = (value.proper.cs, value.proper.en)
      .filter(x => x != none)
      .map(str)
    let industry-values = (value.industry.cs, value.industry.en)
      .filter(x => x != none)
      .map(str)

    industry-values.len() > 0 and industry-values.all(x => x in proper-values)
  }
}

// Canonical term-name presentation:
//   Czech [English] (Industry)
// English is always square-bracketed in bilingual rendering; the industry/common
// name is always parenthesized. Duplicate Czech/English or industry labels collapse.
// The historical formatting arguments remain accepted only for source compatibility.
#let term-name(
  value,
  language: "auto",
  name-type: "auto",
  separator: "bar",
  order: "cs-en",
  type-separator: "paren",
) = context {
  assert(name-type in ("auto", "proper", "industry", "both"), message: "term name type must be auto, proper, industry, or both")
  assert(separator in ("bar", "paren", "dash"), message: "separator must be bar, paren, or dash")
  assert(order in ("cs-en", "en-cs"), message: "term name order must be cs-en or en-cs")
  assert(type-separator in ("bar", "paren", "dash"), message: "term type separator must be bar, paren, or dash")

  let proper = term-proper-name(value, language: language)
  let industry = term-industry-name(value, language: language)

  if industry == none or industry-name-redundant(value) {
    proper
  } else {
    [
      #proper
      #h(0.25em)
      #text("(")
      #industry
      #text(")")
    ]
  }
}

#let term-explanation(
  value,
  language: "auto",
  style: "stacked",
  order: "cs-en",
) = context {
  assert(style in ("inline", "stacked"), message: "term detail style must be inline or stacked")
  let lang = term-language(language, profile-state.get())

  if value.explanation_cs == none and value.explanation_en == none {
    none
  } else {
    let details = translation(cs: value.explanation_cs, en: value.explanation_en)
    render-translation(
      details,
      language: lang,
      school-both: true,
      labels: true,
      stacked: style == "stacked",
      spacing: 2pt,
      separator: "bar",
      order: order,
    )
  }
}

// Jediný renderer všech použití termínu.
// render: "term" | "explanation" | "both"
// language nastavuje společný fallback; name-language/detail-language jej mohou
// nezávisle přepsat. detail-style="inline" vkládá definici přímo do věty.
#let term(
  value,
  render: "term",
  language: "auto",
  name-language: none,
  detail-language: none,
  name-type: "auto",
  name-separator: "bar",
  name-type-separator: "paren",
  name-order: "cs-en",
  detail-order: "cs-en",
  detail-style: "inline",
  register: true,
  linked: true,
  marker: true,
  emphasized: true,
  separator: [ — ],
) = context {
  assert(value.kind == "term", message: "term() expects a value created by define-term()")
  assert(render in ("term", "explanation", "both"), message: "term render must be term, explanation, or both")
  assert(language in ("auto", "cs", "en", "both"), message: "term language must be auto, cs, en, or both")
  assert(name-type in ("auto", "proper", "industry", "both"), message: "term name type must be auto, proper, industry, or both")
  assert(name-separator in ("bar", "paren", "dash"), message: "term name separator must be bar, paren, or dash")
  assert(name-type-separator in ("bar", "paren", "dash"), message: "term name type separator must be bar, paren, or dash")
  assert(name-order in ("cs-en", "en-cs"), message: "term name order must be cs-en or en-cs")
  assert(detail-order in ("cs-en", "en-cs"), message: "term detail order must be cs-en or en-cs")
  assert(detail-style in ("inline", "stacked"), message: "term detail style must be inline or stacked")

  if register and value.keyword {
    [#metadata(value) #term-use-label]
  }

  let name-lang = if name-language == none { language } else { name-language }
  let detail-lang = if detail-language == none { language } else { detail-language }
  let name = term-name(
    value,
    language: name-lang,
    name-type: name-type,
    separator: name-separator,
    type-separator: name-type-separator,
    order: name-order,
  )
  let displayed-name = if emphasized { [_*#name*_] } else { name }
  let referenced-name = if linked {
    link(label("kw-" + value.id))[#displayed-name]
  } else {
    displayed-name
  }
  let with-marker = if marker and render != "explanation" {
    [#referenced-name#text(fill: rgb("#2563eb"), size: 0.75em, baseline: -0.1em)[★]]
  } else {
    referenced-name
  }
  let explanation = term-explanation(value, language: detail-lang, style: detail-style, order: detail-order)

  if render == "term" {
    with-marker
  } else if render == "explanation" {
    explanation
  } else {
    [#with-marker#if explanation != none { [#separator#explanation] }]
  }
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
  items.sorted(key: item => lower(str(if item.proper.cs != none { item.proper.cs } else { item.proper.en })))
}

// Krátký dynamický seznam klíčových slov: pouze termíny skutečně použité
// v dané kompilaci, deduplikované podle stabilního id.
#let render-keywords() = context {
  let items = collect-used-terms(query(term-use-label))

  if items.len() == 0 {
    [—]
  } else {
    text(size: 11pt)[
      #items.map(item => term(
        item,
        render: "term",
        language: "auto",
        name-type: item.keyword_name_type,
        name-separator: "bar",
        register: false,
        linked: false,
        marker: false,
        emphasized: false,
      )).join([, ])
    ]
  }
}

// Detailní terminologický přehled je samostatná encyklopedie. Používá stejnou
// dynamickou množinu termínů jako klíčová slova; hvězdičkové odkazy v rukopisu
// míří na zde umístěné stabilní labely.
#let encyclopedia-sort-name(item) = {
  if item.proper.cs != none { str(item.proper.cs) } else { str(item.proper.en) }
}

#let encyclopedia-letter(item) = upper(encyclopedia-sort-name(item).slice(0, 1))

#let render-encyclopedia() = context {
  let items = collect-used-terms(query(term-use-label))

  if items.len() == 0 {
    [—]
  } else {
    let current-letter = none

    for item in items {
      let letter = encyclopedia-letter(item)

      if letter != current-letter {
        current-letter = letter
        heading(
          level: 2,
          numbering: none,
          outlined: true,
        )[#letter]
      }

      // Every used keyword is a real level-3 outlined section. The document
      // outline has depth 3, so Encyclopedia -> letter -> keyword is visible
      // directly in Obsah while preserving stable kw-* link targets.
      heading(
        level: 3,
        numbering: none,
        outlined: true,
      )[
        #term(
          item,
          render: "term",
          language: "auto",
          name-type: item.keyword_name_type,
          register: false,
          linked: false,
          marker: false,
          emphasized: false,
        )
      ]
      [#label("kw-" + item.id)]

      block(
        breakable: false,
        above: 2pt,
        below: 7pt,
        width: 100%,
      )[
        #term(
          item,
          render: "explanation",
          language: "auto",
          register: false,
          linked: false,
          marker: false,
          emphasized: false,
          detail-style: "stacked",
        )
      ]
    }
  }
}

