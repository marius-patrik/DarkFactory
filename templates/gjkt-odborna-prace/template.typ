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
//  Exportuje funkci `template(..)[body]`, kterou vybírá centrální registry.
// ─────────────────────────────────────────────────────────────

// Caladea je patkové písmo metricky shodné s Cambrií a je přibaleno
// v adresáři `fonts/`, takže sazba je všude identická.
#let template-id = "gjkt-odborna-prace"
#let PISMO = ("Caladea", "New Computer Modern")

#import "wordometer.typ": string-word-count, extract-text
#import "../common.typ": review-state, profile-state, bilingual, ui-label, accepted, finalized, unconfirmed, keyword-heading, render-keywords

// Jediný stav rozsahu práce. Hodnota se vždy počítá ze skutečně vysázené verze
// mezi začátkem vlastního textu a přílohami; normal/review tedy sdílejí stejný algoritmus.
#let word-stats-state = state("word-stats-state", (
  confirmed: (words: 0, chars: 0),
  review: (words: 0, chars: 0),
))

// Strukturální stav šablony: hlavní číslované kapitoly dostávají samostatnou
// titulní stranu, přílohy používají vlastní kompaktní režim.
#let appendix-mode-state = state("gjkt-appendix-mode", false)

#let chapter-title-page(it, logo: none) = context {
  let chapter-no = counter(heading).display(it.numbering)

  pagebreak(weak: true)
  [
    #v(1fr)
    #align(center)[
      #if logo != none {
        block(image(logo, height: 2.2cm))
        v(14pt)
      }
      #text(
        size: 11pt,
        weight: "bold",
        tracking: 1.5pt,
        fill: rgb("#64748b"),
      )[
        #ui-label([KAPITOLA], [CHAPTER]) #chapter-no
      ]
      #v(14pt)
      #text(size: 26pt, weight: "bold", hyphenate: false)[#it.body]
    ]
    #v(1fr)
    <chapter-title-page>
  ]
  pagebreak()

  // Titulní strana kapitoly je fyzická strana dokumentu, ale není součástí
  // logického číslování. Po přechodu na první obsahovou stranu kapitoly proto
  // logický čítač vrátíme o jednu.
  counter(page).update(n => n - 1)
}

#let regular-level-one-heading(it) = block(
  above: 21pt,
  below: 10pt,
  sticky: true,
  text(size: 16pt, weight: "bold", it),
)

#let nadpis-bez-cisla(text-nadpisu) = {
  heading(numbering: none, outlined: true, text-nadpisu)
}

#let title-for(meta) = context {
  let profile = profile-state.get()
  if profile == "cs" {
    meta.at("nazev-cs", default: meta.nazev)
  } else if profile == "en" {
    meta.at("nazev-en", default: meta.nazev)
  } else {
    meta.nazev
  }
}

#let titulni-list(meta, logo: none) = {
  set align(center)
  set par(justify: false)

  if logo != none {
    block(image(logo, height: 3cm))
    v(0.5cm)
  } else {
    v(1cm)
  }

  text(size: 14pt, weight: "bold", meta.skola)

  v(1fr)

  context {
    let profile = profile-state.get()
    if profile == "merged" {
      text(size: 25pt, weight: "bold", hyphenate: false, finalized(meta.nazev))
      v(0.25cm)
      text(size: 17pt, weight: "bold", hyphenate: false, finalized(meta.at("nazev-en", default: meta.nazev)))
    } else {
      text(size: 26pt, weight: "bold", hyphenate: false, finalized(title-for(meta)))
    }
  }

  if meta.at("podnazev", default: none) != none {
    v(0.4cm)
    text(size: 14pt, meta.podnazev)
  }

  v(0.7cm)
  text(size: 15pt, tracking: 2pt, ui-label([ODBORNÁ PRÁCE], [THESIS]))

  v(1fr)

  set align(left)
  set text(size: 12pt)

  context {
    let s = word-stats-state.final()
    let range-line(stats) = [
      #ui-label([Rozsah práce], [Extent]): #stats.words #ui-label([slov], [words]) / #stats.chars #ui-label([znaků], [characters])
    ]

    // Obě hodnoty používají stejné review funkce jako samotný rukopis:
    // potvrzený rozsah je vždy přítomen, review rozsah se v čisté verzi
    // automaticky ztratí přes unfinalized().
    let rozsahy = stack(
      dir: ttb,
      spacing: 3pt,
      finalized(range-line(s.confirmed)),
      unfinalized(range-line(s.review)),
    )

    grid(
      columns: (1fr, auto),
      column-gutter: 1.2em,
      row-gutter: 4pt,
      [#ui-label([Autor práce], [Author]): #meta.autor#if meta.at("trida", default: none) != none [, #meta.trida]],
      rozsahy,
      if meta.at("vedouci", default: none) != none [#ui-label([Vedoucí práce], [Supervisor]): #meta.vedouci],
      none,
      ..if meta.at("konzultant", default: none) != none {
        ([#ui-label([Konzultant], [Consultant]): #meta.konzultant], none)
      } else { () },
    )
  }

  v(0.8cm)
  set align(center)
  text(size: 12pt, str(meta.rok))

  pagebreak()
}

#let prohlaseni(meta) = {
  nadpis-bez-cisla[#finalized[#ui-label([Prohlášení], [Declaration])]]

  let zkratka = meta.at("skola-zkratka", default: meta.skola)
  let cs = confirmed[
    Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval/a
    samostatně pod dohledem vedoucího uvedeného na první straně. Všechny
    použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané
    jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby
    tištěná forma práce byla uchována na #meta.skola a tam používána jako
    tištěný zdroj např. pro další studentské práce či pro prezentaci
    vzdělávání na #zkratka.
  ]
  let en = confirmed[
    I declare that I prepared this specialized thesis independently under the
    supervision of the supervisor named on the title page. All sources used
    are listed in the bibliography and information derived from them is cited
    in the text. I agree that the printed version may be archived at
    #meta.skola and used there as a reference for future student work or for
    presenting education at #zkratka.
  ]

  bilingual(cs, en)

  v(1.5cm)
  [#ui-label([V #meta.mesto dne], [In #meta.mesto on]) #box(width: 4.5cm, repeat("…")) #h(1fr) #ui-label([Podpis autora práce], [Author signature]): #box(width: 4.5cm, repeat("…"))]

  pagebreak()
}

#let podekovani-strana(meta) = {
  let p = meta.at("podekovani", default: none)
  if p == none { return }
  nadpis-bez-cisla[Poděkování]
  p
  pagebreak()
}

#let anotace-strana(meta) = context {
  let profile = profile-state.get()

  if profile in ("school", "cs", "merged") {
    nadpis-bez-cisla[#finalized[Anotace]]
    meta.anotace
  }

  if profile in ("school", "merged") {
    pagebreak(weak: true)
  }

  if profile in ("school", "en", "merged") {
    nadpis-bez-cisla[#finalized[Annotation]]
    meta.abstract
  }

  pagebreak(weak: true)

  nadpis-bez-cisla[#finalized[#keyword-heading()]]
  render-keywords()

  pagebreak()
}

#let template(
  meta: (:),
  // Cesta k logu školy, např. "/img/logo.jpeg". `none` = bez loga.
  logo: none,
  // Vodoznak přes každou stranu: v review módu "KONCEPT", v čistém módu none
  koncept: auto,
  // Režim zobrazení recenzních značek a diffu: auto (podle sys.inputs), true (review) nebo false (raw čistá verze)
  review: auto,
  // Publikační profil: "school", "cs", "en" nebo "merged".
  profile: "school",
  // Kompatibilita se starším API; pokud je zadáno, mapuje cs -> school.
  language: none,
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

  let resolved-profile = if language == none {
    profile
  } else if language == "cs" {
    "school"
  } else {
    language
  }

  assert(resolved-profile in ("school", "cs", "en", "merged"), message: "profile must be school, cs, en, or merged")
  review-state.update(is-review)
  profile-state.update(resolved-profile)

  set document(title: title-for(meta), author: meta.autor)

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

  // Neobalený historický text je zatím český. Bilingvní helper nastavuje jazyk
  // jednotlivých CS/EN větví sám, takže EN režim neaplikuje anglické dělení slov
  // na dosud nepřeložené české kapitoly.
  set text(font: pismo, size: velikost, lang: "cs", hyphenate: true)
  set par(
    justify: true,
    leading: radkovani * 0.65em,
    spacing: mezera-odstavec,
    // První řádek odstavce se zleva zvlášť neodsazuje.
    first-line-indent: 0pt,
  )

  // Jednotná kostra seznamů: dostatek prostoru pro čitelnost, ale bez
  // vertikálního "nafukování" práce. Delší seznamy se smějí přirozeně dělit.
  set list(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
  set enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt)
  set terms(indent: 0pt, hanging-indent: 1.6em, spacing: 4pt)

  // Seznamy mají vlastní malý vnější rytmus. Nejsou svázány do jednoho
  // nerozdělitelného bloku, takže dlouhé seznamy mohou přirozeně pokračovat
  // na další stránce.
  show list: it => block(above: 3pt, below: 5pt, breakable: true, it)
  show enum: it => block(above: 3pt, below: 5pt, breakable: true, it)
  show terms: it => block(above: 3pt, below: 5pt, breakable: true, it)

  // Za poslední číslicí čísla kapitoly se nepíše tečka.
  set heading(numbering: "1.1")

  // Hlavní číslované kapitoly mají vlastní titulní stranu. Manuskript pouze
  // deklaruje sémantický nadpis úrovně 1; veškeré stránkování a vizuální
  // zpracování kapitoly vlastní šablona. Nečíslované nadpisy přední části
  // a nadpisy příloh zůstávají kompaktní.
  show heading.where(level: 1): it => context {
    let in-appendix = appendix-mode-state.get()
    if it.numbering != none and not in-appendix {
      chapter-title-page(it, logo: logo)
    } else {
      regular-level-one-heading(it)
    }
  }
  show heading.where(level: 2): it => {
    block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))
  }
  show heading.where(level: 3): it => {
    block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))
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
  set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
  set figure(numbering: "1")

  // ── Přední část ──────────────────────────────────────────
  titulni-list(meta, logo: logo)
  prohlaseni(meta)
  podekovani-strana(meta)
  anotace-strana(meta)

  outline(title: ui-label([Obsah], [Contents]), depth: 3, indent: auto)

  if seznam-soucasti {
    pagebreak(weak: true)
    outline(
      title: ui-label([Seznam obrázků a tabulek], [List of figures and tables]),
      target: figure.where(kind: image).or(figure.where(kind: table)),
    )
  }

  // ── Vlastní text ─────────────────────────────────────────
  // Čísla stran se uvádí od úvodu; za stranu 1 se považuje titulní strana,
  // proto se čítač nikde nenuluje.
  set page(footer: context {
    let physical-page = here().page()
    let is-chapter-title = query(<chapter-title-page>).any(
      item => item.location().page() == physical-page
    )

    if not is-chapter-title {
      align(center, text(
        font: pismo,
        size: 11pt,
        counter(page).display("1"),
      ))
    }
  })

  [#metadata("body-start") <body-start-anchor>]

  body

  // ── Zadní část ───────────────────────────────────────────
  if bibliografie != none {
    pagebreak(weak: true)
    bibliography(bibliografie, style: bib-styl, title: ui-label([Seznam zdrojů], [References]), full: true)
  }

  // ── Jednotný výpočet rozsahu pro normal i review ──────────
  // Počítá se pouze vlastní text práce (Úvod–Závěr). Normal verze skryje
  // unconfirmed text, review jej zobrazí; confirmed je v obou. Tím vznikne
  // správný počet bez druhého paralelního zdroje pravdy.
  context {
    let core = sel => selector(sel)
      .after(<body-start-anchor>, inclusive: false)
      .before(<appendix-start-anchor>, inclusive: false)

    // Blokové struktury mohou obsahovat text, který není samostatným odstavcem.
    // Počítáme proto jen jejich nejvyšší úroveň a odstavce uvnitř nich vynecháme,
    // aby žádný text nebyl započítán dvakrát.
    let containers = selector(list).or(enum).or(terms).or(table).or(figure.caption)
    let nested-par-locs = query(core(selector(par).within(containers))).map(it => it.location())
    let nested-list-locs = query(core(selector(list).within(containers))).map(it => it.location())
    let nested-enum-locs = query(core(selector(enum).within(containers))).map(it => it.location())
    let nested-terms-locs = query(core(selector(terms).within(containers))).map(it => it.location())
    let nested-table-locs = query(core(selector(table).within(containers))).map(it => it.location())

    let review-words = 0
    let review-chars = 0
    let stats-of = item => string-word-count(extract-text(item))

    for p in query(core(par)) {
      if p.location() not in nested-par-locs {
        let s = stats-of(p.body)
        review-words += s.words
        review-chars += s.characters
      }
    }

    for item in query(core(list)) {
      if item.location() not in nested-list-locs {
        let s = stats-of(item)
        review-words += s.words
        review-chars += s.characters
      }
    }

    for item in query(core(enum)) {
      if item.location() not in nested-enum-locs {
        let s = stats-of(item)
        review-words += s.words
        review-chars += s.characters
      }
    }

    for item in query(core(terms)) {
      if item.location() not in nested-terms-locs {
        let s = stats-of(item)
        review-words += s.words
        review-chars += s.characters
      }
    }

    for item in query(core(table)) {
      if item.location() not in nested-table-locs {
        let s = stats-of(item)
        review-words += s.words
        review-chars += s.characters
      }
    }

    for h in query(core(heading)) {
      let s = stats-of(h.body)
      review-words += s.words
      review-chars += s.characters
    }

    // Popisky obrázků nejsou odstavce ani tabulky, ale jsou součástí práce.
    for caption in query(core(figure.caption)) {
      let s = stats-of(caption)
      review-words += s.words
      review-chars += s.characters
    }

    // Pracovní vrstvy review dokumentu nejsou součástí skutečného rozsahu.
    for item in query(core(<callout>)) {
      let s = stats-of(item)
      review-words -= s.words
      review-chars -= s.characters
    }
    for item in query(core(<removed-diff>)) {
      let s = stats-of(item)
      review-words -= s.words
      review-chars -= s.characters
    }
    for item in query(core(<diff-prefix>)) {
      let s = stats-of(item)
      review-words -= s.words
      review-chars -= s.characters
    }

    // Review rozsah odpovídá review rukopisu po odečtení pracovních calloutů,
    // odstraněné strany diffů a vizuálních +/- prefixů.
    let review-stats = (
      words: calc.max(0, review-words),
      chars: calc.max(0, review-chars),
    )

    // V čisté kompilaci je review-stats zároveň potvrzený rozsah, protože
    // unfinalized() nic nevysází. Review build dostane potvrzený rozsah z
    // předchozího Typst eval nad stejným template/profile vstupem.
    let confirmed-words-input = sys.inputs.at("confirmed-words", default: none)
    let confirmed-chars-input = sys.inputs.at("confirmed-chars", default: none)
    let confirmed-stats = if is-review and confirmed-words-input != none and confirmed-chars-input != none {
      (
        words: int(confirmed-words-input),
        chars: int(confirmed-chars-input),
      )
    } else {
      review-stats
    }

    let stats = (
      confirmed: confirmed-stats,
      review: review-stats,
    )
    word-stats-state.update(stats)
    [#metadata(stats) <word-stats>]
  }
}

// Přílohy se číslují a odkazuje se na ně v textu; obsahuje-li práce
// přílohy, musí obsahovat i jejich seznam.
#let prilohy(body) = {
  pagebreak(weak: true)
  [#metadata("appendix-start") <appendix-start-anchor>]
  appendix-mode-state.update(true)

  // Nadpis seznamu vzniká ještě před `set`, aby sám sebe nezahrnul.
  nadpis-bez-cisla[#finalized[#ui-label([Seznam příloh], [List of appendices])]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(supplement: [Příloha]))
  [#body <appendix>]

  appendix-mode-state.update(false)
}
