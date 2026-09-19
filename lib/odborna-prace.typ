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

#import "wordometer.typ": string-word-count, extract-text

// Jediný stav rozsahu práce. Hodnota se vždy počítá ze skutečně vysázené verze
// mezi začátkem vlastního textu a přílohami; normal/review tedy sdílejí stejný algoritmus.
#let word-stats-state = state("word-stats-state", (words: 0, chars: 0))

// Sdílené stavební prvky sazby pro ručně skládané části dokumentu.
// Běžný markdownový text používá stejné hodnoty přes globální set pravidla níže.
#let body-paragraph(body) = block(breakable: true, body)
#let bullet-list(..items) = list(indent: 0pt, body-indent: 0.75em, spacing: 4pt, ..items)
#let numbered-list(..items) = enum(indent: 0pt, body-indent: 0.75em, spacing: 4pt, ..items)
#let paragraph = body-paragraph
#let bullets = bullet-list
#let numbered = numbered-list

#let nadpis-bez-cisla(text-nadpisu) = {
  heading(numbering: none, outlined: true, text-nadpisu)
}

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

// Zelený podtržený text pro uživatelem potvrzený, avšak nefinalizovaný text (confirmed)
#let confirmed(body) = context if review-state.get() {
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

// Srovnávací diff funkce: v review módu GitHub-style "- old" / "+ new"; v raw módu pouze nový text
#let diff(old, new) = context if review-state.get() {
  [#removed(old) #added(new)]
} else {
  new
}

#let default-terms = (
  (
    en: "Agent",
    cs: "Agent",
    explanation_en: "A software system driven by a language model and equipped with tools, capable of independently planning, observing the state of its environment, and carrying out multi-step actions toward a specified goal.",
    explanation_cs: "Softwarový systém řízený jazykovým modelem a vybavený nástroji, který samostatně plánuje, vnímá stav prostředí a provádí vícekrokové akce směřující k dosažení zadaného cíle.",
  ),
  (
    en: "Agent Loop",
    cs: "Agentní smyčka",
    explanation_en: "An iterative execution cycle of an autonomous agent, based on the ReAct pattern (Reasoning + Acting), in which the model alternates between reasoning, tool calls, and evaluation of observations from the runtime environment.",
    explanation_cs: "Iterativní prováděcí cyklus autonomního agenta (založený na vzoru ReAct: Reasoning + Acting), v němž model střídavě uvažuje, volá nástroje a vyhodnocuje pozorování z běhového prostředí.",
  ),
  (
    en: "Chatbot",
    cs: "Chatbot",
    explanation_en: "A language-model-based system designed primarily for text interaction with a user; it responds to conversational requests but does not by itself provide an autonomous execution loop for modifying the surrounding environment.",
    explanation_cs: "Systém založený na jazykovém modelu určený především k textové interakci s uživatelem; odpovídá na požadavky v konverzaci, ale sám o sobě neposkytuje autonomní prováděcí smyčku pro změny okolního prostředí.",
  ),
  (
    en: "Context Rot",
    cs: "Degradace kontextu",
    explanation_en: "A practical term for degradation in a model's ability to reliably use relevant information as the context becomes long, noisy, or internally competing, which can lead to missed instructions and lost relationships between facts.",
    explanation_cs: "Degradace pozornosti a kvality logického uvažování modelu způsobená zaplněním kontextového okna dlouhou historií a šumem, vedoucí k přehlížení instrukcí a ztrátě souvislostí.",
  ),
  (
    en: "Embedding",
    cs: "Vektorová reprezentace",
    explanation_en: "A multidimensional vector representation used to encode tokens or other data so that numerical operations can capture useful relationships between representations.",
    explanation_cs: "Vícerozměrná vektorová reprezentace textu a tokenů, v níž geometrická vzdálenost a úhel vektorů zachycují sémantickou příbuznost a významové vztahy.",
  ),
  (
    en: "Git",
    cs: "Git",
    explanation_en: "A distributed version-control system for recording source-history changes, branching, merging, and returning to earlier repository states.",
    explanation_cs: "Distribuovaný systém správy verzí umožňující sledování historie změn kódu, větvení a deterministické vracení k předchozím funkčním stavům repozitáře.",
  ),
  (
    en: "GitHub",
    cs: "GitHub",
    explanation_en: "A platform for hosting Git repositories and coordinating software-development workflows such as Issues, Pull Requests, and CI/CD automation.",
    explanation_cs: "Cloudová platforma pro hosting gitových repozitářů, správu vývojového cyklu (Issues, Pull Requests) a automatizaci CI/CD pracovních postupů.",
  ),
  (
    en: "Harness",
    cs: "Řídicí harness",
    explanation_en: "The application and orchestration layer surrounding a model's inference core; it provides tools, context management, guardrails, state handling, and control over the execution lifecycle.",
    explanation_cs: "Řídicí postroj — aplikační a orchestrační vrstva obklopující inferenční jádro modelu, která zajišťuje běhové prostředí nástrojů, dynamickou správu kontextového okna, bezpečnostní mantinely a deterministické řízení životního cyklu požadavku.",
  ),
  (
    en: "Human-in-the-loop",
    cs: "Zapojení člověka do smyčky",
    explanation_en: "A design pattern in which a human operator remains part of the system's decision process, for example through approval gates before selected consequential actions.",
    explanation_cs: "Návrhový vzor vyžadující autorizaci lidského operátora formou schvalovacích bran (Human Gates) v klíčových rozhodovacích bodech před provedením nevratných systémových operací.",
  ),
  (
    en: "MCP",
    cs: "MCP",
    explanation_en: "Model Context Protocol, an open protocol for connecting AI applications to external tools, resources, and data sources through standardized interfaces.",
    explanation_cs: "Model Context Protocol — otevřený standard navržený společností Anthropic pro standardizovanou komunikaci mezi jazykovými modely a externími nástroji či datovými zdroji přes protokol JSON-RPC.",
  ),
  (
    en: "Plugins",
    cs: "Zásuvné moduly",
    explanation_en: "Programmatic extension modules that add specialized adapters, tools, or deterministic execution behavior to the harness runtime.",
    explanation_cs: "Zásuvné moduly běžící přímo v běhovém prostředí harnessu, které rozšiřují jeho exekuční jádro o specializované systémové adaptéry, ovladače nástrojů a deterministické záchytné body.",
  ),
  (
    en: "Prompt Engineering",
    cs: "Promptové inženýrství",
    explanation_en: "The systematic design and structuring of instructions and prompts used to shape and constrain the behavior of a language model.",
    explanation_cs: "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.",
  ),
  (
    en: "Pull Request",
    cs: "Pull Request",
    explanation_en: "A formal proposal to integrate changes from one repository branch into another, providing a place for automated checks, human review, and discussion.",
    explanation_cs: "Formální návrh na začlenění změn z jedné větve repozitáře do druhé, který slouží jako platforma pro automatizované testování (CI), kódovou revizi člověkem a diskusi o navržených úpravách.",
  ),
  (
    en: "Skills",
    cs: "Dovednosti",
    explanation_en: "Reusable packages of instructions, procedural rules, and optional helper resources that a harness can load into an agent's context for a particular class of task.",
    explanation_cs: "Znovupoužitelné modulární balíčky instrukcí (SKILL.md), procedurálních pravidel a pomocných skriptů, které harness dynamicky načítá do kontextu agenta podle povahy řešeného úkolu.",
  ),
)

#let term-label = <thesis-term-meta>

#let keyword-id(name) = "kw-" + lower(name).replace(regex("[^a-z0-9]+"), "-").trim("-")

// Standardní podoba odborného termínu podle publikačního profilu.
#let term-display(en, cs) = context {
  let profile = profile-state.get()
  if profile == "cs" {
    text(lang: "cs")[#cs]
  } else if profile == "en" {
    text(lang: "en")[#en]
  } else {
    [#text(lang: "en")[#en] (#text(lang: "cs")[#cs])]
  }
}

#let bilingual-term(en, cs) = [#text(lang: "en")[#en] (#text(lang: "cs")[#cs])]

/// Zavedení odborného termínu v textu.
/// Parametr explanation zůstává kompatibilní se staršími voláními a chápe se
/// jako české vysvětlení; nové texty mohou předat explanation_en / explanation_cs.
#let term(name, cs: none, explanation: none, explanation_en: none, explanation_cs: none) = {
  let id = keyword-id(name)
  let found = default-terms.find(t => t.en == name)
  let cs-name = if cs != none { cs } else if found != none { found.cs } else { name }
  let en-expl = if explanation_en != none {
    explanation_en
  } else if found != none {
    found.explanation_en
  } else {
    none
  }
  let cs-expl = if explanation_cs != none {
    explanation_cs
  } else if explanation != none {
    explanation
  } else if found != none {
    found.explanation_cs
  } else {
    none
  }

  if en-expl != none or cs-expl != none {
    [#metadata((
      name: name,
      cs: cs-name,
      explanation_en: en-expl,
      explanation_cs: cs-expl,
      id: id,
    )) #term-label]
  }

  link(label(id))[_*#term-display(name, cs-name)*_#text(fill: rgb("#2563eb"), size: 0.75em, baseline: -0.1em)[▾]]
}

#let kw = term

#let language-badge(code) = text(
  size: 8.5pt,
  weight: "bold",
  fill: rgb("#475569"),
)[[#code]]

#let keyword-heading() = context {
  let profile = profile-state.get()
  if profile == "cs" {
    [Klíčová slova]
  } else if profile == "en" {
    [Keywords]
  } else {
    [Klíčová slova | Keywords]
  }
}

#let keyword-name(item) = context {
  let profile = profile-state.get()
  if profile == "cs" {
    text(lang: "cs")[#item.cs]
  } else if profile == "en" {
    text(lang: "en")[#item.en]
  } else {
    bilingual-term(item.en, item.cs)
  }
}

/// Jeden renderer terminologického přehledu pro všechny profily.
#let render-keywords() = context {
  let profile = profile-state.get()
  let items = default-terms.sorted(key: t => lower(t.en))

  text(size: 11pt)[
    #items.map(t => keyword-name(t)).join([, ])
  ]

  v(12pt)

  for item in items {
    let id = keyword-id(item.en)
    block(
      breakable: false,
      above: 6pt,
      below: 7pt,
      width: 100%,
    )[
      #text(weight: "bold", size: 11pt)[#keyword-name(item)] #label(id) \
      #v(2pt)
      #if profile in ("school", "merged", "en") {
        [#language-badge("EN") #h(0.35em) #text(lang: "en", size: 10pt)[#item.explanation_en]]
      }
      #if profile in ("school", "merged") { [\ #v(1pt)] }
      #if profile in ("school", "merged", "cs") {
        [#language-badge("CZ") #h(0.35em) #text(lang: "cs", size: 10pt)[#item.explanation_cs]]
      }
    ]
  }
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
      text(size: 25pt, weight: "bold", hyphenate: false, confirmed(meta.nazev))
      v(0.25cm)
      text(size: 17pt, weight: "bold", hyphenate: false, confirmed(meta.at("nazev-en", default: meta.nazev)))
    } else {
      text(size: 26pt, weight: "bold", hyphenate: false, confirmed(title-for(meta)))
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
    let is-rev = review-state.get()
    let s = word-stats-state.final()
    let rozsah = [#ui-label([Rozsah práce], [Extent]): #s.words #ui-label([slov], [words]) / #s.chars #ui-label([znaků], [characters])]
    let rozsah-vysazeny = if is-rev {
      text(size: 9pt, fill: rgb("#64748b"))[#rozsah]
    } else {
      rozsah
    }

    grid(
      columns: (1fr, auto),
      column-gutter: 1.2em,
      row-gutter: 4pt,
      [#ui-label([Autor práce], [Author]): #meta.autor#if meta.at("trida", default: none) != none [, #meta.trida]],
      rozsah-vysazeny,
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
  nadpis-bez-cisla[#confirmed[#ui-label([Prohlášení], [Declaration])]]

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
    nadpis-bez-cisla[#confirmed[Anotace]]
    meta.anotace
  }

  if profile in ("school", "merged") {
    pagebreak(weak: true)
  }

  if profile in ("school", "en", "merged") {
    nadpis-bez-cisla[#confirmed[Annotation]]
    meta.abstract
  }

  pagebreak(weak: true)

  nadpis-bez-cisla[#confirmed[#keyword-heading()]]
  render-keywords()

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

  // Mezera před nadpisem = velikost písma nadpisu + 5 b, a je vždy větší
  // než mezera pod nadpisem, aby bylo zřejmé, ke které kapitole text patří.
  show heading.where(level: 1): it => {
    if it.numbering != none { pagebreak(weak: true) }
    block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
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
  set page(footer: context align(center, text(
    font: pismo, size: 11pt, counter(page).display("1"),
  )))

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

    let words = 0
    let chars = 0
    let stats-of = item => string-word-count(extract-text(item))

    for p in query(core(par)) {
      if p.location() not in nested-par-locs {
        let s = stats-of(p.body)
        words += s.words
        chars += s.characters
      }
    }

    for item in query(core(list)) {
      if item.location() not in nested-list-locs {
        let s = stats-of(item)
        words += s.words
        chars += s.characters
      }
    }

    for item in query(core(enum)) {
      if item.location() not in nested-enum-locs {
        let s = stats-of(item)
        words += s.words
        chars += s.characters
      }
    }

    for item in query(core(terms)) {
      if item.location() not in nested-terms-locs {
        let s = stats-of(item)
        words += s.words
        chars += s.characters
      }
    }

    for item in query(core(table)) {
      if item.location() not in nested-table-locs {
        let s = stats-of(item)
        words += s.words
        chars += s.characters
      }
    }

    for h in query(core(heading)) {
      let s = stats-of(h.body)
      words += s.words
      chars += s.characters
    }

    // Popisky obrázků nejsou odstavce ani tabulky, ale jsou součástí práce.
    for caption in query(core(figure.caption)) {
      let s = stats-of(caption)
      words += s.words
      chars += s.characters
    }

    // Pracovní vrstvy review dokumentu nejsou součástí skutečného rozsahu.
    for item in query(core(<callout>)) {
      let s = stats-of(item)
      words -= s.words
      chars -= s.characters
    }
    for item in query(core(<removed-diff>)) {
      let s = stats-of(item)
      words -= s.words
      chars -= s.characters
    }
    for item in query(core(<diff-prefix>)) {
      let s = stats-of(item)
      words -= s.words
      chars -= s.characters
    }

    let stats = (
      words: calc.max(0, words),
      chars: calc.max(0, chars),
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
  // Nadpis seznamu vzniká ještě před `set`, aby sám sebe nezahrnul.
  nadpis-bez-cisla[#confirmed[#ui-label([Seznam příloh], [List of appendices])]]
  counter(heading).update(0)
  set heading(numbering: "A.1", supplement: [Příloha])
  outline(title: none, target: heading.where(supplement: [Příloha]))
  [#body <appendix>]
}
