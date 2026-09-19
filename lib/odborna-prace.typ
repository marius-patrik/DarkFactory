// ─────────────────────────────────────────────────────────────
//  Šablona pro odbornou práci na Gymnáziu J. K. Tyla.
//
//  Rozvržení odpovídá kapitole 4 („Formální stránka práce“)
//  školního Průvodce tvorbou odborné práce:
//    • okraje 2,5 cm, u hřbetu navíc 0,5 cm (tedy 3 cm)
//    • hlavní text patkovým písmem 12 b, zarovnaný do bloku
//    • řádkování 1,5; mezera pod odstavcem 8 b; bez odsazení
//    • číslování kapitol bez tečky za poslední číslicí
//    • nadpisy tučně 16 / 14 / 12 b
//    • čísla stran v zápatí, na střed, 11 b, od úvodu
//
//  Šablona sama neobsahuje žádné jméno ani logo.
// ─────────────────────────────────────────────────────────────

// Caladea je patkové písmo metricky shodné s Cambrií a je přibaleno
// v adresáři `fonts/`, takže sazba je všude identická.
#let PISMO = ("Caladea", "New Computer Modern")

#import "wordometer.typ": string-word-count, extract-text, word-count-of

#let word-count-total = state("word-count-total", 0)
#let word-count-core = state("word-count-core", 0)

#let nadpis-bez-cisla(text-nadpisu) = {
  heading(numbering: none, outlined: true, text-nadpisu)
}

#let review-state = state("review-mode", sys.inputs.at("review", default: "false") in ("true", "1", "yes"))

#let is-review() = context review-state.get()

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

// Zelené zvýraznění pro nově přidaný text (nahrazuje původní koncept ai)
#let added(body) = context if review-state.get() {
  highlight(fill: rgb("bbf7d0"))[#body]
} else {
  body
}
#let ai = added

// Žluté zvýraznění pro neověřený text konceptu (draft / unconfirmed)
// V ne-revizní (raw) verzi se neověřený text zcela vynechává (none)
#let draft(body) = context if review-state.get() {
  highlight(fill: rgb("fef08a"))[#body]
} else {
  none
}
#let unconfirmed = draft

// Modré zvýraznění pro uživatelem potvrzený, avšak nefinalizovaný text (confirmed)
#let confirmed(body) = context if review-state.get() {
  highlight(fill: rgb("bfdbfe"))[#body]
} else {
  body
}

// Červené zvýraznění s přeškrtnutím pro odstraněný text (removed)
#let removed(body) = context if review-state.get() {
  [#highlight(fill: rgb("fee2e2"))[#strike(stroke: 0.8pt + rgb("ef4444"))[#body]] <removed-diff>]
} else {
  none
}

// Srovnávací diff funkce: v review módu (červený původní + zelený nový); v raw módu pouze nový text bez zvýraznění
#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(new)]
} else {
  new
}

#let default-terms = (
  "Agent": "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného cíle.",
  "Agent Loop": "Iterativní prováděcí cyklus autonomního agenta (založený na vzoru ReAct: Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.",
  "Chatbot": "Systém založený na jazykovém modelu určený k pasivní textové interakci s uživatelem; odpovídá na jednotlivé dotazy v chatu, avšak nedisponuje nástroji pro samostatnou modifikaci okolního prostředí.",
  "Context Rot": "Degradace pozornosti a kvality logického uvažování modelu způsobená zaplněním kontextového okna dlouhou historií a šumem, vedoucí k přehlížení instrukcí a ztrátě souvislostí.",
  "Embedding": "Vícerozměrná vektorová reprezentace textu a tokenů, v níž geometrická vzdálenost a úhel vektorů zachycují sémantickou příbuznost a významové vztahy.",
  "Git": "Distribuovaný systém správy verzí umožňující sledování historie změn kódu, větvení a deterministické vracení k předchozím funkčním stavům repozitáře.",
  "GitHub": "Cloudová platforma pro hosting gitových repozitářů, správu vývojového cyklu (Issues, Pull Requests) a automatizaci CI/CD pracovních postupů.",
  "Harness": "Řídicí postroj — aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která zajišťuje běhové prostředí nástrojů, dynamickou správu kontextového okna, bezpečnostní mantinely a deterministické řízení životního cyklu požadavku.",
  "Human-in-the-loop": "Návrhový vzor vyžadující autorizaci lidského operátora formou schvalovacích bran (Human Gates) v klíčových rozhodovacích bodech před provedením nevratných systémových operací.",
  "MCP": "Model Context Protocol — otevřený standard navržený společností Anthropic pro standardizovanou komunikaci mezi jazykovými modely a externími nástroji či datovými zdroji přes protokol JSON-RPC.",
  "Plugins": "Zásuvné moduly běžící přímo v běhovém prostředí harnessu, které rozšiřují jeho exekuční jádro o specializované systémové adaptéry, ovladače nástrojů a deterministické záchytné body.",
  "Prompt Engineering": "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.",
  "Pull Request": "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako platforma pro automatizované testování (CI), kódovou revizi člověkem a diskusi o navržených úpravách.",
  "Skills": "Znovupoužitelné modulární balíčky instrukcí (SKILL.md), procedurálních pravidel a pomocných skriptů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.",
)

#let term-label = <thesis-term-meta>

/// Funkce pro zavedení a odkazování odborného termínu v textu.
/// V textu termín vysází tučně a kurzívou s klikatelným symbolem šipky (▾),
/// který odkazuje na jeho definici v sekci Klíčová slova.
/// Pokud je předán parametr `explanation`, termín se dynamicky zaregistruje
/// a vykreslí v přehledu klíčových slov.
#let term(name, explanation: none) = {
  let id = "kw-" + lower(name).replace(regex("[^a-z0-9]+"), "-").trim("-")
  let expl = if explanation != none { explanation } else { default-terms.at(name, default: none) }
  if expl != none {
    [#metadata((name: name, explanation: expl, id: id)) #term-label]
  }
  link(label(id))[_*#name*_#text(fill: rgb("#2563eb"), size: 0.75em, baseline: -0.1em)[▾]]
}

#let kw = term

/// Vykreslení klíčových slov a odborných termínů
#let render-keywords() = context {
  let entries = query(term-label)
  let seen = (:)
  let unique = ()
  for e in entries {
    let d = e.value
    let key = lower(d.name)
    if key not in seen and d.explanation != none and d.explanation != "" {
      seen.insert(key, true)
      unique.push(d)
    }
  }
  // Pokud ještě dotaz nevrátil záznamy (v 1. běhu), použij default-terms
  if unique.len() == 0 {
    for (k, v) in default-terms {
      let id = "kw-" + lower(k).replace(regex("[^a-z0-9]+"), "-").trim("-")
      unique.push((name: k, explanation: v, id: id))
    }
  }
  unique = unique.sorted(key: x => x.name)

  if unique.len() > 0 {
    block(width: 100%, [
      #set text(size: 9.5pt)
      #grid(
        columns: (1fr),
        row-gutter: 6pt,
        ..unique.map(item => block(
          fill: rgb("#f8fafc"),
          stroke: (left: 2.5pt + rgb("#2563eb")),
          inset: (x: 8pt, y: 5pt),
          radius: (right: 3pt),
          width: 100%,
          [
            #text(weight: "bold", size: 10pt, fill: rgb("#0f172a"))[#item.name] #label(item.id) \
            #v(-2pt)
            #text(size: 9pt, fill: rgb("#334155"))[#item.explanation]
          ]
        ))
      )
    ])
  }
}

#let word-stats-state = state("word-stats-state", (total: 5863, core: 3523))

#let titulni-list(meta, logo: none) = {
  set align(center)
  // Titulní list se nezarovnává do bloku — roztahování mezer v názvu práce
  // vypadá jako chyba sazby.
  set par(justify: false)

  if logo != none {
    block(image(logo, height: 3cm))
    v(0.5cm)
  } else {
    v(1cm)
  }

  text(size: 14pt, weight: "bold", meta.skola)

  v(1fr)

  // Nadpis se nedělí na slabiky — dělení slov v názvu práce působí nedbale.
  text(size: 26pt, weight: "bold", hyphenate: false, confirmed(meta.nazev))

  if meta.at("podnazev", default: none) != none {
    v(0.4cm)
    text(size: 14pt, meta.podnazev)
  }

  v(0.7cm)
  text(size: 15pt, tracking: 2pt, "ODBORNÁ PRÁCE")

  v(1fr)

  set align(left)
  set text(size: 12pt)
  [Autor práce: #meta.autor#if meta.at("trida", default: none) != none [, #meta.trida]]
  linebreak()
  if meta.at("vedouci", default: none) != none [Vedoucí práce: #meta.vedouci]
  if meta.at("konzultant", default: none) != none {
    linebreak()
    [Konzultant: #meta.konzultant]
  }

  v(0.8cm)
  set align(center)
  text(size: 12pt, str(meta.rok))

  context if review-state.get() {
    v(0.6cm)
    let s = word-stats-state.get()
    block(
      fill: rgb("#f8fafc"),
      stroke: 0.5pt + rgb("#cbd5e1"),
      inset: (x: 12pt, y: 7pt),
      radius: 4pt,
      [
        #text(size: 9.5pt, weight: "bold", fill: rgb("#1e293b"))[📊 Rozsah textu práce (pouze v recenzním režimu):] \
        #v(2pt)
        #text(size: 9pt, fill: rgb("#334155"))[
          *Celkový počet slov:* #s.total #h(1.5em) | #h(1.5em) *Jádro práce (bez balastu):* #s.core
        ]
      ]
    )
  }

  pagebreak()
}

#let prohlaseni(meta) = {
  nadpis-bez-cisla[#confirmed[Prohlášení]]

  let zkratka = meta.at("skola-zkratka", default: meta.skola)
  confirmed[
    Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval/a
    samostatně pod dohledem vedoucího uvedeného na první straně. Všechny
    použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané
    jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby
    tištěná forma práce byla uchována na #meta.skola a tam používána jako
    tištěný zdroj např. pro další studentské práce či pro prezentaci
    vzdělávání na #zkratka.
  ]

  v(1.5cm)
  [V #meta.mesto dne #box(width: 4.5cm, repeat("…")) #h(1fr) Podpis autora práce: #box(width: 4.5cm, repeat("…"))]

  pagebreak()
}

#let podekovani-strana(meta) = {
  let p = meta.at("podekovani", default: none)
  if p == none { return }
  nadpis-bez-cisla[Poděkování]
  p
  pagebreak()
}

#let anotace-strana(meta) = {
  nadpis-bez-cisla[#confirmed[Anotace]]
  meta.anotace

  nadpis-bez-cisla[#confirmed[Klíčová slova]]
  render-keywords()

  pagebreak(weak: true)

  nadpis-bez-cisla[#confirmed[Annotation]]
  meta.abstract

  nadpis-bez-cisla[#confirmed[Keywords]]
  confirmed(meta.keywords.join(", "))

  pagebreak()
}

#let odborna-prace(
  meta: (:),
  // Cesta k logu školy, např. "/img/logo.jpeg". `none` = bez loga.
  logo: none,
  // Vodoznak přes každou stranu: v review módu "KONCEPT", v čistém módu none
  koncept: auto,
  // Režim zobrazení recenzních značek a diffu: auto (podle sys.inputs), true (review) nebo false (raw čistá verze)
  review: auto,
  pismo: PISMO,
  velikost: 12pt,
  radkovani: 1.5,
  mezera-odstavec: 8pt,
  // Seznam obrázků a tabulek — vyžadován, obsahuje-li práce součásti textu.
  seznam-soucasti: true,
  bibliografie: "/bib/references.bib",
  // "iso-690-numeric" = číselné odkazy, "iso-690-author-date" = harvardský
  // systém. Způsob citací určuje vedoucí práce.
  bib-styl: "iso-690-numeric",
  body,
) = {
  let is-review = if review == auto {
    sys.inputs.at("review", default: "false") in ("true", "1", "yes")
  } else {
    review
  }
  let vodoznak = if koncept == auto {
    if is-review { "KONCEPT" } else { none }
  } else {
    koncept
  }

  review-state.update(is-review)


  set document(title: meta.nazev, author: meta.autor)

  // Okraje 2,5 cm; u hřbetu (vlevo) navíc 0,5 cm kvůli vazbě.
  set page(
    paper: "a4",
    margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 2.5cm),
    // Titulní strana a přední část se počítají, ale nečíslují.
    footer: none,
    background: if vodoznak != none {
      rotate(-45deg, text(size: 90pt, fill: rgb(0, 0, 0, 18), weight: "bold", vodoznak))
    },
  )

  set text(font: pismo, size: velikost, lang: "cs", hyphenate: true)
  set par(
    justify: true,
    leading: radkovani * 0.65em,
    spacing: mezera-odstavec,
    // První řádek odstavce se zleva zvlášť neodsazuje.
    first-line-indent: 0pt,
  )
  // Za poslední číslicí čísla kapitoly se nepíše tečka.
  set heading(numbering: "1.1")

  // Mezera před nadpisem = velikost písma nadpisu + 5 b, a je vždy větší
  // než mezera pod nadpisem, aby bylo zřejmé, ke které kapitole text patří.
  show heading.where(level: 1): it => {
    if it.numbering != none { pagebreak(weak: true) }
    block(above: 21pt, below: 10pt, text(size: 16pt, weight: "bold", it))
  }
  show heading.where(level: 2): it => {
    block(above: 19pt, below: 9pt, text(size: 14pt, weight: "bold", it))
  }
  show heading.where(level: 3): it => {
    block(above: 17pt, below: 8pt, text(size: 12pt, weight: "bold", it))
  }

  // Popisky součástí textu: stejné písmo jako text, velikost 10 b.
  show figure.caption: set text(size: 10pt)
  show raw: set text(font: ("DejaVu Sans Mono", "Courier New"), size: 9.5pt)
  show raw.where(block: true): it => block(
    fill: rgb("#1e293b"),
    stroke: 0.5pt + rgb("#334155"),
    inset: (x: 10pt, y: 8pt),
    radius: 4pt,
    width: 100%,
    text(fill: rgb("#f1f5f9"), it),
  )
  show raw.where(block: false): it => box(
    fill: rgb("#f1f5f9"),
    stroke: 0.3pt + rgb("#cbd5e1"),
    inset: (x: 3pt, y: 1pt),
    radius: 2pt,
    text(fill: rgb("#0f172a"), it),
  )
  show link: set text(fill: rgb("#0b4f9e"))
  set table(stroke: 0.5pt)
  set figure(numbering: "1")

  // ── Přední část ──────────────────────────────────────────
  titulni-list(meta, logo: logo)
  prohlaseni(meta)
  podekovani-strana(meta)
  anotace-strana(meta)

  outline(title: "Obsah", depth: 3, indent: auto)

  if seznam-soucasti {
    pagebreak(weak: true)
    outline(
      title: "Seznam obrázků a tabulek",
      target: figure.where(kind: image).or(figure.where(kind: table)),
    )
  }

  // ── Vlastní text ─────────────────────────────────────────
  // Čísla stran se uvádí od úvodu; za stranu 1 se považuje titulní strana,
  // proto se čítač nikde nenuluje.
  set page(footer: context align(center, text(
    font: pismo, size: 11pt, counter(page).display("1"),
  )))

  [#metadata("body-start") <body-start-anchor>]

  body

  // ── Zadní část ───────────────────────────────────────────
  if bibliografie != none {
    pagebreak(weak: true)
    bibliography(bibliografie, style: bib-styl, title: "Seznam zdrojů", full: true)
  }

  if is-review {
    context {
      let start_anchors = query(<body-start-anchor>)
    let app_anchors = query(<appendix-start-anchor>)
    let start_page = if start_anchors.len() > 0 { start_anchors.first().location().page() } else { 0 }
    let end_page = if app_anchors.len() > 0 { app_anchors.first().location().page() } else { 999999 }

    let pars = query(par)
    let lists = query(list)
    let enums = query(enum)
    let callouts = query(<callout>)
    let diffs_old = query(<removed-diff>)

    let callout_words = 0
    for c in callouts {
      callout_words += string-word-count(extract-text(c)).words
    }

    let diff_old_words = 0
    for d in diffs_old {
      diff_old_words += string-word-count(extract-text(d)).words
    }

    let total_words = 0
    let core_words = 0

    for p in pars {
      let pg = p.location().page()
      let w = string-word-count(extract-text(p.body)).words
      total_words += w
      if pg >= start_page and pg < end_page {
        core_words += w
      }
    }

    for l in lists {
      let pg = l.location().page()
      let w = string-word-count(extract-text(l)).words
      total_words += w
      if pg >= start_page and pg < end_page {
        core_words += w
      }
    }

    for e in enums {
      let pg = e.location().page()
      let w = string-word-count(extract-text(e)).words
      total_words += w
      if pg >= start_page and pg < end_page {
        core_words += w
      }
    }

    let core_clean = calc.max(0, core_words - callout_words - diff_old_words)
    if pars.len() >= 130 {
      word-stats-state.update(curr => {
        if curr.total == total_words and curr.core == core_clean {
          curr
        } else {
          (total: total_words, core: core_clean)
        }
      })
    }
  }}
}

// Přílohy se číslují a odkazuje se na ně v textu; obsahuje-li práce
// přílohy, musí obsahovat i jejich seznam.
#let prilohy(body) = {
  pagebreak(weak: true)
  [#metadata("appendix-start") <appendix-start-anchor>]
  // Nadpis seznamu vzniká ještě před `set`, aby sám sebe nezahrnul.
  nadpis-bez-cisla[#confirmed[Seznam příloh]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(supplement: [Příloha]))
  [#body <appendix>]
}
