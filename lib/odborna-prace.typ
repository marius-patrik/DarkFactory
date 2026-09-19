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

#let nadpis-bez-cisla(text-nadpisu) = {
  heading(numbering: none, outlined: true, text-nadpisu)
}

#let review-state = state("review-mode", sys.inputs.at("review", default: "false") in ("true", "1", "yes"))

#let is-review() = context review-state.get()

#let note(body) = context if review-state.get() {
  block(
    fill: rgb("ecfdf5"),
    stroke: (left: 3pt + rgb("10b981")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("065f46"), size: 10.5pt)[💡 *Návrh na vylepšení:* #body]
  )
} else {
  none
}

#let issue(body) = context if review-state.get() {
  block(
    fill: rgb("fef2f2"),
    stroke: (left: 3pt + rgb("ef4444")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("991b1b"), size: 10.5pt)[⚠️ *Chyba / Nesrovnalost k opravě:* #body]
  )
} else {
  none
}

#let alert(body) = context if review-state.get() {
  block(
    fill: rgb("fefce8"),
    stroke: (left: 3pt + rgb("eab308")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("854d0e"), size: 10.5pt)[📐 *Strukturální upozornění:* #body]
  )
} else {
  none
}

#let struct-alert = alert

#let critique(body) = context if review-state.get() {
  block(
    fill: rgb("fff7ed"),
    stroke: (left: 3pt + rgb("ea580c")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("9a3412"), size: 10.5pt)[🔥 *Hloubková kritika / Oponentura:* #body]
  )
} else {
  none
}

#let scope-note(body) = context if review-state.get() {
  block(
    fill: rgb("eff6ff"),
    stroke: (left: 3pt + rgb("3b82f6")),
    inset: (x: 10pt, y: 8pt),
    radius: (right: 4pt),
    width: 100%,
    text(fill: rgb("1e40af"), size: 10.5pt)[📌 *Metodické vymezení / Rozsah práce:* #body]
  )
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
  highlight(fill: rgb("fee2e2"))[#strike(stroke: 0.8pt + rgb("ef4444"))[#body]]
} else {
  none
}

// Srovnávací diff funkce: v review módu (červený původní + zelený nový); v raw módu pouze nový text bez zvýraznění
#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(new)]
} else {
  new
}

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
  confirmed(meta.klicova-slova.join(", "))

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

  body

  // ── Zadní část ───────────────────────────────────────────
  if bibliografie != none {
    pagebreak(weak: true)
    bibliography(bibliografie, style: bib-styl, title: "Seznam zdrojů", full: true)
  }
}

// Přílohy se číslují a odkazuje se na ně v textu; obsahuje-li práce
// přílohy, musí obsahovat i jejich seznam.
#let prilohy(body) = {
  pagebreak(weak: true)
  // Nadpis seznamu vzniká ještě před `set`, aby sám sebe nezahrnul.
  nadpis-bez-cisla[#confirmed[Seznam příloh]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(supplement: [Příloha]))
  body
}
