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

#let is-review() = context review-state.get()

// Jediný publikační režim: český rukopis, samostatná Anotace a Abstract,
 // canonical industry/proper terminology.
#let bilingual(cs, en, stacked: true) = text(lang: "cs")[#cs]

#let localized = bilingual

#let ui-label(cs, en) = text(lang: "cs")[#cs]


// Bilingvní hodnota je datový objekt, ne předem vysázený obsah. Stejná data lze
// použít v anotaci, názvech sekcí i dalších překládaných částech dokumentu.
#let translation(cs: none, en: none) = {
  assert(cs != none or en != none, message: "translation requires at least one language")
  (cs: cs, en: en)
}

#let resolve-language(language, school-both: false) = {
  if language != "auto" {
    language
  } else if school-both {
    "both"
  } else {
    "cs"
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
  let lang = resolve-language(language, school-both: school-both)
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

#let resolve-citation-label(c) = {
  if c == none { none }
  else if type(c) == label { c }
  else if type(c) == str { label(c) }
  else if type(c) == dictionary and "citation" in c { resolve-citation-label(c.citation) }
  else if type(c) == dictionary and "label" in c { resolve-citation-label(c.label) }
  else { none }
}

#let semantic-term(value) = {
  assert(value.kind in ("concept", "section"), message: "term API expects a semantic concept or section")
  assert(value.term != none or value.keyword != none, message: "semantic item requires term or keyword")
  value
}

#let term-source(value) = {
  semantic-term(value)
  value.source
}

#let term-citation(value) = {
  semantic-term(value)
  value.citation
}

#let term-full-name(value) = {
  semantic-term(value)
  if value.term != none and value.keyword != none {
    value.term + " (" + value.keyword + ")"
  } else if value.term != none {
    value.term
  } else {
    value.keyword
  }
}

#let term-name(value) = term-full-name(value)

#let term-sort-name(value) = {
  semantic-term(value)
  if value.term != none { str(value.term) } else { str(value.keyword) }
}

#let term-link-label(value) = {
  semantic-term(value)
  if value.kind == "section" {
    label("section-" + value.key)
  } else {
    label("concept-" + value.key)
  }
}

#let term(
  value,
  linked: true,
  marker: true,
  emphasized: true,
  cite: false,
) = context {
  semantic-term(value)
  let name = term-full-name(value)
  let displayed = if emphasized { [_*#name*_] } else { name }
  if linked {
    displayed = link(term-link-label(value), displayed)
  }
  if cite and value.citation != none {
    let render-c(c) = {
      let lbl = resolve-citation-label(c)
      if lbl != none { cite(lbl) } else { none }
    }
    let cites = if type(value.citation) == array {
      value.citation.map(render-c).filter(x => x != none).join()
    } else {
      render-c(value.citation)
    }
    if cites != none { displayed = [#displayed~#cites] }
  }
  if marker {
    [#displayed#super[#text(fill: rgb("#2563eb"), size: 0.72em)[#text("*")]]]
  } else {
    displayed
  }
}

#let kw = term
#let render-term = term

#let render-keywords(items) = context {
  let unique = ()
  for item in items.filter(item => item.keyword != none) {
    if not unique.any(existing => existing.key == item.key) {
      unique.push(item)
    }
  }
  let ordered = unique.sorted(key: item => lower(term-sort-name(item)))
  if ordered.len() == 0 {
    [—]
  } else {
    text(size: 11pt, fill: black)[
      #ordered.map(item => term(
        item,
        linked: false,
        marker: false,
        emphasized: false,
      )).join([, ])
    ]
  }
}
