#import "/DarkFactory/templates/common.typ": finalized, term, translation, render-translation, resolve-citation-label, profile-state

// Semantic relations never determine manuscript containment.
// Folder manifests are the sole source of section hierarchy.
#let relation(type, target) = {
  assert(type in ("dependency", "related"), message: "unsupported semantic relation: " + type)
  assert(target != none, message: "concept relation requires a target")
  (type: type, target: target)
}

#let concept(
  key: none,
  term: none,
  heading: none,
  definition: none,
  document_enabled: false,
  document_intro: none,
  document_body: none,
  document_summary: none,
  document_after: none,
  document_wrapper: none,
  theory_enabled: false,
  theory_intro: none,
  theory_body: none,
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: (),
) = {
  assert(key != none, message: "concept requires a stable key")
  assert(term != none, message: "concept requires canonical terminology")
  (
    kind: "concept",
    key: key,
    term: term,
    heading: heading,
    definition: definition,
    document_enabled: document_enabled,
    document_intro: document_intro,
    document_body: document_body,
    document_summary: document_summary,
    document_after: document_after,
    document_wrapper: document_wrapper,
    theory_enabled: theory_enabled,
    theory_intro: theory_intro,
    theory_body: theory_body,
    theory_summary: theory_summary,
    theory_after: theory_after,
    theory_wrapper: theory_wrapper,
    practical_enabled: practical_enabled,
    practical_intro: practical_intro,
    practical_body: practical_body,
    practical_summary: practical_summary,
    practical_after: practical_after,
    practical_wrapper: practical_wrapper,
    relations: relations,
  )
}

#let folder(
  key: none,
  title: none,
  section: none,
  concepts: (),
  children: (),
) = {
  assert(key != none, message: "folder requires a stable key")
  (
    kind: "folder",
    key: key,
    title: title,
    section: section,
    concepts: concepts,
    children: children,
  )
}

#let collect-folder-concepts(node) = {
  let result = ()
  if node.section != none { result.push(node.section) }
  for item in node.concepts { result.push(item) }
  for child in node.children {
    for item in collect-folder-concepts(child) { result.push(item) }
  }
  result
}

#let collect-concepts(folders) = {
  let result = ()
  for node in folders {
    for item in collect-folder-concepts(node) { result.push(item) }
  }
  result
}

#let build-vocabulary(folders) = {
  let result = (:)
  for item in collect-concepts(folders) {
    assert(not item.key in result, message: "duplicate concept key: " + item.key)
    result.insert(item.key, item.term)
  }
  result
}

#let semantic-graph(folders) = {
  let concepts = collect-concepts(folders)
  let keys = concepts.map(item => item.key)
  let dependencies = (:)
  let related = (:)
  for item in concepts {
    dependencies.insert(item.key, ())
    related.insert(item.key, ())
  }

  for item in concepts {
    for edge in item.relations {
      assert(edge.type in ("dependency", "related"), message: "unsupported semantic relation " + edge.type + " on " + item.key)
      assert(edge.target in keys, message: "unknown relation target " + edge.target + " from " + item.key)
      if edge.type == "dependency" {
        if not edge.target in dependencies.at(item.key) {
          dependencies.at(item.key).push(edge.target)
        }
      } else {
        if not edge.target in related.at(item.key) {
          related.at(item.key).push(edge.target)
        }
        if not item.key in related.at(edge.target) {
          related.at(edge.target).push(item.key)
        }
      }
    }
  }

  // Validate dependency acyclicity globally.
  let done = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      if dependencies.at(key).all(dep => dep in done or not dep in remaining) {
        done.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "dependency cycle in concept graph")
  }

  (dependencies: dependencies, related: related)
}

#let concept-enabled(item, mode) = if mode == "theory" {
  item.theory_enabled
} else if mode == "practical" {
  item.practical_enabled
} else if mode == "document" {
  item.document_enabled
} else {
  false
}

#let render-concept-content(item, terms, mode) = {
  if concept-enabled(item, mode) {
    let intro = if mode == "theory" { item.theory_intro } else if mode == "practical" { item.practical_intro } else { item.document_intro }
    let body = if mode == "theory" { item.theory_body } else if mode == "practical" { item.practical_body } else { item.document_body }
    let summary = if mode == "theory" { item.theory_summary } else if mode == "practical" { item.practical_summary } else { item.document_summary }
    let after = if mode == "theory" { item.theory_after } else if mode == "practical" { item.practical_after } else { item.document_after }
    let wrapper = if mode == "theory" { item.theory_wrapper } else if mode == "practical" { item.practical_wrapper } else { item.document_wrapper }

    let core = []
    if intro != none { core += intro(terms) }
    if body != none { core += body(terms) }
    if summary != none { core += summary(terms) }

    let output = if wrapper == none { core } else { wrapper(core) }
    if after != none { output += after(terms) }
    output
  }
}

#let order-local(items, graph) = {
  let keys = items.map(item => item.key)
  let result = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      let deps = graph.dependencies.at(key)
      if deps.filter(dep => dep in keys).all(dep => dep in result) {
        result.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "local dependency cycle")
  }
  result.map(key => items.find(item => item.key == key))
}

#let order-folders(nodes, graph) = {
  let keyed = nodes.filter(node => node.section != none)
  let unkeyed = nodes.filter(node => node.section == none)
  let keys = keyed.map(node => node.section.key)
  let result = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      let deps = graph.dependencies.at(key)
      if deps.filter(dep => dep in keys).all(dep => dep in result) {
        result.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "sibling section dependency cycle")
  }
  result.map(key => keyed.find(node => node.section.key == key)) + unkeyed
}

#let folder-has-content(node, mode) = {
  let section-content = node.section != none and concept-enabled(node.section, mode)
  let direct-content = node.concepts.any(item => concept-enabled(item, mode))
  let child-content = node.children.any(child => folder-has-content(child, mode))
  section-content or direct-content or child-content
}

#let render-section-title(item) = context {
  let profile = profile-state.get()
  term(
    item.term,
    render: "term",
    surface: "proper",
    language: if profile in ("school", "cs") { "cs" } else if profile == "en" { "en" } else { "both" },
    register: false,
    linked: false,
    marker: false,
    emphasized: false,
  )
}

#let render-section-definition(item, terms) = {
  if item.definition != none {
    (item.definition)(terms)
  } else {
    let value = item.term
    if value.explanation_cs == none and value.explanation_en == none {
      none
    } else {
      let definition = render-translation(
        translation(cs: value.explanation_cs, en: value.explanation_en),
        language: "auto",
        school-both: false,
        labels: false,
        stacked: false,
        separator: "bar",
        order: "cs-en",
      )
      let render-citation(c) = {
        let lbl = resolve-citation-label(c)
        if lbl != none { cite(lbl) } else { none }
      }
      let citations = if value.citation == none {
        none
      } else if type(value.citation) == array {
        value.citation.map(render-citation).filter(x => x != none).join()
      } else {
        render-citation(value.citation)
      }
      if citations == none { definition } else { [#definition~#citations] }
    }
  }
}

#let render-folder(node, terms, graph, mode, level: 2) = {
  if folder-has-content(node, mode) {
    let output = []
    let child-level = level

    if node.section != none {
      // Folder structure owns section hierarchy. The designated section concept
      // contributes only its canonical term name; legacy manual heading renderers
      // must never determine visible section titles.
      output += [#heading(level: level)[#finalized[#render-section-title(node.section)]]]
      child-level = level + 1

      let intro = if mode == "theory" { node.section.theory_intro } else if mode == "practical" { node.section.practical_intro } else { node.section.document_intro }
      let body = if mode == "theory" { node.section.theory_body } else if mode == "practical" { node.section.practical_body } else { node.section.document_body }
      let summary = if mode == "theory" { node.section.theory_summary } else if mode == "practical" { node.section.practical_summary } else { node.section.document_summary }
      let after = if mode == "theory" { node.section.theory_after } else if mode == "practical" { node.section.practical_after } else { node.section.document_after }
      let wrapper = if mode == "theory" { node.section.theory_wrapper } else if mode == "practical" { node.section.practical_wrapper } else { node.section.document_wrapper }

      // The section's root content is its canonical definition.
      let definition = render-section-definition(node.section, terms)
      if definition != none {
        output += definition
      }

      // Every folder section exposes an Úvod subsection sourced strictly from
      // the concept intro variable for the active manuscript mode.
      output += heading(level: child-level)[#finalized[Úvod]]
      if intro != none {
        let intro-content = intro(terms)
        let uvod-body = if wrapper == none { intro-content } else { wrapper(intro-content) }
        output += uvod-body
      }

      if body != none {
        let body-content = if wrapper == none { body(terms) } else { wrapper(body(terms)) }
        output += body-content
      }

      if summary != none {
        let summary-content = if wrapper == none { summary(terms) } else { wrapper(summary(terms)) }
        output += summary-content
      }

      if after != none {
        output += after(terms)
      }
    }

    for item in order-local(node.concepts, graph) {
      let rendered = render-concept-content(item, terms, mode)
      if rendered != none { output += rendered }
    }

    for child in order-folders(node.children, graph) {
      let rendered = render-folder(child, terms, graph, mode, level: child-level)
      if rendered != none { output += rendered }
    }
    output
  }
}

#let render-folders(folders, terms, mode, level: 2) = {
  let graph = semantic-graph(folders)
  let output = []
  for node in folders {
    let rendered = render-folder(node, terms, graph, mode, level: level)
    if rendered != none { output += rendered }
  }
  output
}

#let render-document-chapter(node, terms) = {
  let graph = semantic-graph((node,))
  let output = [#heading(level: 1)[#finalized[#render-section-title(node.section)]]]

  let definition = render-section-definition(node.section, terms)
  if definition != none { output += definition }

  if node.section.document_enabled {
    let intro = node.section.document_intro
    let body = node.section.document_body
    let summary = node.section.document_summary
    let after = node.section.document_after
    let wrapper = node.section.document_wrapper

    if intro != none {
      output += heading(level: 2)[#finalized[Úvod]]
      let intro-content = intro(terms)
      output += if wrapper == none { intro-content } else { wrapper(intro-content) }
    }
    if body != none {
      let body-content = body(terms)
      output += if wrapper == none { body-content } else { wrapper(body-content) }
    }
    if summary != none {
      let summary-content = summary(terms)
      output += if wrapper == none { summary-content } else { wrapper(summary-content) }
    }
    if after != none { output += after(terms) }
  }

  for item in order-local(node.concepts, graph) {
    let rendered = render-concept-content(item, terms, "document")
    if rendered != none { output += rendered }
  }
  for child in order-folders(node.children, graph) {
    let rendered = render-folder(child, terms, graph, "document", level: 2)
    if rendered != none { output += rendered }
  }
  output
}

#let render-theory-chapter(folders, terms) = context {
  let profile = profile-state.get()
  let title = if profile in ("school", "cs") {
    [Agentické AI]
  } else if profile == "en" {
    [Agentic AI]
  } else {
    [Agentic AI (Agentické AI)]
  }
  [
    #heading(level: 1)[#finalized[#title]]
    #finalized[Úvod]
    #render-folders(folders, terms, "theory")
  ]
}

#let render-practical-chapter(folders, terms) = context {
  let profile = profile-state.get()
  let title = if profile == "en" {
    [DarkFactory: Harness Architecture - Practical Part]
  } else if profile == "merged" {
    [DarkFactory: Harness Architecture (Architektura harnessu) - Practical Part (Praktická část)]
  } else {
    [DarkFactory: Architektura harnessu - Praktická část]
  }
  [
    #heading(level: 1)[#finalized[#title]]
    #finalized[Úvod]
    #render-folders(folders, terms, "practical")
  ]
}
