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

#import "/DarkFactory/templates/gjkt-odborna-prace/wordometer.typ": string-word-count, extract-text
#import "/DarkFactory/templates/common.typ": review-state, profile-state, bilingual, ui-label, accepted, finalized, unconfirmed, translation, render-translation, translation-heading, render-keywords
#import "/DarkFactory/metadata.typ": title-value, title-display

// Jediný stav rozsahu práce. Hodnota se vždy počítá ze skutečně vysázené verze
// mezi začátkem vlastního textu a přílohami; normal/review tedy sdílejí stejný algoritmus.
#let word-stats-state = state("word-stats-state", (
  raw: (words: 0, chars: 0),
  review: (words: 0, chars: 0),
))

#let regular-level-one-heading(it) = block(
  above: 21pt,
  below: 10pt,
  sticky: true,
  text(size: 16pt, weight: "bold", it),
)

#let nadpis-bez-cisla(text-nadpisu) = {
  heading(numbering: none, outlined: true, text-nadpisu)
}

#let titulni-list(book-title, meta, logo: none) = {
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
      text(size: 25pt, weight: "bold", hyphenate: false, finalized(title-display(book-title, profile: profile)))
      v(0.25cm)
      text(size: 17pt, weight: "bold", hyphenate: false, finalized(title-value(book-title, profile: "en")))
    } else {
      text(size: 26pt, weight: "bold", hyphenate: false, finalized(cover-title(meta)))
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
    // automaticky ztratí přes unconfirmed().
    let rozsahy = stack(
      dir: ttb,
      spacing: 3pt,
      finalized(range-line(s.raw)),
      unconfirmed(range-line(s.review)),
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
  let cs = finalized[
    Prohlašuji, že jsem tuto studentskou odbornou práci vypracoval/a
    samostatně pod dohledem vedoucího uvedeného na první straně. Všechny
    použité zdroje jsou uvedeny v seznamu zdrojů a informace z nich získané
    jsou v textu řádně označeny odkazem na zdroj. Souhlasím s tím, aby
    tištěná forma práce byla uchována na #meta.skola a tam používána jako
    tištěný zdroj např. pro další studentské práce či pro prezentaci
    vzdělávání na #zkratka.
  ]
  let en = finalized[
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

#let front-matter-section(title, body, break-after: true) = {
  nadpis-bez-cisla[
    #finalized[
      #translation-heading(
        title,
        language: "auto",
        school-both: true,
        separator: "paren",
        order: "en-cs",
      )
    ]
  ]
  body
  if break-after { pagebreak(weak: true) }
}

#let anotace-strana(meta) = {
  front-matter-section(
    translation(cs: [Anotace], en: [Annotation]),
    render-translation(
      meta.annotation,
      language: "auto",
      school-both: true,
      labels: true,
      stacked: true,
      spacing: 8pt,
      order: "cs-en",
    ),
  )

  front-matter-section(
    translation(cs: [Klíčová slova], en: [Keywords]),
    render-keywords(),
  )

  pagebreak()
}

#let template(
  book-title: none,
  meta: (:),
  // Cesta k logu školy, např. "/DarkFactory/img/logo.jpeg". `none` = bez loga.
  logo: none,
  // Volitelný explicitní vodoznak. Review režim žádný automatický vodoznak nepřidává.
  koncept: none,
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
  bibliografie: "/DarkFactory/bib/references.bib",
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
  let vodoznak = if koncept == auto { none } else { koncept }

  let resolved-profile = if language == none {
    profile
  } else if language == "cs" {
    "school"
  } else {
    language
  }

  assert(book-title != none, message: "template requires the structural book title")
  assert(resolved-profile in ("school", "cs", "en", "merged"), message: "profile must be school, cs, en, or merged")
  review-state.update(is-review)
  profile-state.update(resolved-profile)

  set document(title: title-value(book-title, profile: resolved-profile), author: meta.autor)

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

  // Hlavní kapitoly pokračují přímo v toku dokumentu. Speciální titulní
  // sazbu používá pouze titulní list celé práce.
  show heading.where(level: 1): it => regular-level-one-heading(it)
  show heading.where(level: 2): it => {
    block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))
  }
  show heading.where(level: 3): it => {
    block(above: 17pt, below: 8pt, sticky: true, text(size: 12pt, weight: "bold", it))
  }
  // Všechny hlubší sémantické sekce zůstávají skutečnými číslovanými nadpisy.
  // Nesnižujeme je na ručně tučný text jen proto, že jsou zanořené.
  show heading.where(level: 4): it => {
    block(above: 14pt, below: 6pt, sticky: true, text(size: 11pt, weight: "bold", it))
  }
  show heading.where(level: 5): it => {
    block(above: 12pt, below: 5pt, sticky: true, text(size: 10.5pt, weight: "bold", it))
  }
  show heading.where(level: 6): it => {
    block(above: 10pt, below: 4pt, sticky: true, text(size: 10pt, weight: "bold", it))
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
  show cite: it => super(it)
  set table(stroke: 0.5pt, inset: (x: 5pt, y: 4pt))
  set figure(numbering: "1")

  // ── Přední část ──────────────────────────────────────────
  titulni-list(book-title, meta, logo: logo)
  prohlaseni(meta)
  podekovani-strana(meta)
  anotace-strana(meta)

  outline(title: ui-label([Obsah], [Contents]), depth: 6, indent: auto)

  // ── Vlastní text ─────────────────────────────────────────
  // Čísla stran se uvádí od úvodu; za stranu 1 se považuje titulní strana,
  // proto se čítač nikde nenuluje.
  set page(footer: context {
    align(center, text(
      font: pismo,
      size: 11pt,
      counter(page).display("1"),
    ))
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
  // unconfirmed text, review jej zobrazí; accepted/finalized jsou v obou. Tím vznikne
  // správný počet bez druhého paralelního zdroje pravdy.
  context {
    let core = sel => selector(sel)
      .after(<body-start-anchor>, inclusive: false)
      .before(<body-end-anchor>, inclusive: false)

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
    // unconfirmed() nic nevysází. Review build dostane potvrzený rozsah z
    // předchozího Typst eval nad stejným template/profile vstupem.
    let raw-words-input = sys.inputs.at("raw-words", default: none)
    let raw-chars-input = sys.inputs.at("raw-chars", default: none)
    let raw-stats = if is-review and raw-words-input != none and raw-chars-input != none {
      (
        words: int(raw-words-input),
        chars: int(raw-chars-input),
      )
    } else {
      review-stats
    }

    let stats = (
      raw: raw-stats,
      review: review-stats,
    )
    word-stats-state.update(stats)
    [#metadata(stats) <word-stats>]
  }
}

// Přílohy se číslují a odkazuje se na ně v textu; obsahuje-li práce
// přílohy, musí obsahovat i jejich seznam.
#let prilohy(body) = {
  [#metadata("body-end") <body-end-anchor>]
  pagebreak(weak: true)
  [#metadata("appendix-start") <appendix-start-anchor>]

  // Seznam obrázků a tabulek je součást zadní/přílohové části a díky
  // skutečnému outlined nadpisu se zároveň objeví v hlavním Obsahu.
  nadpis-bez-cisla[#finalized[#ui-label([Seznam obrázků a tabulek], [List of figures and tables])]]
  outline(
    title: none,
    target: figure.where(kind: image).or(figure.where(kind: table)),
  )
  pagebreak(weak: true)

  // Seznam příloh zůstává součástí práce; jeho položky vznikají pouze ze
  // skutečně přítomných příloh.
  nadpis-bez-cisla[#finalized[#ui-label([Seznam příloh], [List of appendices])]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(level: 1, supplement: [Příloha]))
  [#body <appendix>]
}
