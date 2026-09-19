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
// ale stále může projít dalším začištěním. V review zůstává zeleně podtržený.
#let accepted(body) = context if review-state.get() {
  underline(stroke: 1.3pt + rgb("#16a34a"), offset: 2.5pt)[#body]
} else {
  body
}

// Finalizovaný text/struktura: považuje se za uzavřenou součást dokumentu.
// Záměrně se vysazuje čistě v review i raw verzi; rozdíl je sémantický ve zdroji.
#let finalized(body) = body

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

  link(label(id))[_*#term-display(name, cs-name)*_#text(fill: rgb("#2563eb"), size: 0.75em, baseline: -0.1em)[★]]
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

