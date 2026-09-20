#import "../templates/common.typ": finalized

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
  assert(heading != none, message: "concept requires a heading renderer")
  (
    kind: "concept",
    key: key,
    term: term,
    heading: heading,
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
  section: none,
  concepts: (),
  children: (),
) = {
  assert(key != none, message: "folder requires a stable key")
  (
    kind: "folder",
    key: key,
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
      // parent/child literals from the previous architecture are ignored while
      // files are mechanically migrated; they never affect rendering.
      if edge.type in ("dependency", "related") {
        assert(edge.target in keys, message: "unknown relation target " + edge.target + " from " + item.key)
        if edge.type == "dependency" {
          dependencies.at(item.key).push(edge.target)
        } else {
          related.at(item.key).push(edge.target)
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

#let concept-enabled(item, mode) = if mode == "theory" { item.theory_enabled } else { item.practical_enabled }

#let render-concept-content(item, terms, mode) = {
  if concept-enabled(item, mode) {
    let intro = if mode == "theory" { item.theory_intro } else { item.practical_intro }
    let body = if mode == "theory" { item.theory_body } else { item.practical_body }
    let summary = if mode == "theory" { item.theory_summary } else { item.practical_summary }
    let after = if mode == "theory" { item.theory_after } else { item.practical_after }
    let wrapper = if mode == "theory" { item.theory_wrapper } else { item.practical_wrapper }

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

#let folder-has-content(node, mode) = {
  (node.section != none and concept-enabled(node.section, mode))
  or node.concepts.any(item => concept-enabled(item, mode))
  or node.children.any(child => folder-has-content(child, mode))
}

#let render-folder(node, terms, graph, mode, level: 2) = {
  if folder-has-content(node, mode) {
    let output = []
    let child-level = level

    if node.section != none {
      output += [#heading(level: level)[#(node.section.heading)(terms)]]
      let section-content = render-concept-content(node.section, terms, mode)
      if section-content != none { output += section-content }
      child-level = level + 1
    }

    for item in order-local(node.concepts, graph) {
      let rendered = render-concept-content(item, terms, mode)
      if rendered != none { output += rendered }
    }

    for child in node.children {
      let rendered = render-folder(child, terms, graph, mode, level: child-level)
      if rendered != none { output += rendered }
    }
    output
  }
}

#let render-folders(folders, terms, mode) = {
  let graph = semantic-graph(folders)
  let output = []
  for node in folders {
    let rendered = render-folder(node, terms, graph, mode)
    if rendered != none { output += rendered }
  }
  output
}

#let render-theory-chapter(folders, terms) = [
  #heading(level: 1)[#finalized[Agentické AI: Vymezení konceptů - Teoretická část]]
  #finalized[Úvod]
  #render-folders(folders, terms, "theory")
]

#let render-practical-chapter(folders, terms) = [
  #heading(level: 1)[#finalized[DarkFactory: Architektura harnessu - Praktická část]]
  #finalized[Úvod]
  #render-folders(folders, terms, "practical")
]
