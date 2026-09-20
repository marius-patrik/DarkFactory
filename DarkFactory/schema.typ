#import "/DarkFactory/templates/common.typ": finalized, term, translation, render-translation, resolve-citation-label, profile-state

#let relation(type, target) = {
  assert(type in ("dependency", "related"), message: "unsupported semantic relation: " + type)
  assert(target != none, message: "concept relation requires a target")
  (type: type, target: target)
}

#let concept(
  key: none,
  term: none,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),

  // Transitional input fields consumed during the source migration. They are
  // normalized into description/summary and will be removed once every concept
  // source uses the canonical schema.
  heading: none,
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
) = {
  assert(key != none, message: "concept requires a stable key")
  assert(term != none, message: "concept requires canonical terminology")
  (
    kind: "concept",
    key: key,
    term: term,
    definition: definition,
    description: description,
    summary: summary,
    visual: visual,
    examples: examples,
    attachments: attachments,
    citations: citations,
    relations: relations,
    legacy: (
      heading: heading,
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
    ),
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

#let collect-concept(item) = {
  let result = (item,)
  for child in item.examples { result += collect-concept(child) }
  for child in item.attachments { result += collect-concept(child) }
  result
}

#let collect-folder-concepts(node) = {
  let result = ()
  if node.section != none { result += collect-concept(node.section) }
  for item in node.concepts { result += collect-concept(item) }
  for child in node.children { result += collect-folder-concepts(child) }
  result
}

#let collect-concepts(folders) = {
  let result = ()
  for node in folders { result += collect-folder-concepts(node) }
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
        if not edge.target in dependencies.at(item.key) { dependencies.at(item.key).push(edge.target) }
      } else {
        if not edge.target in related.at(item.key) { related.at(item.key).push(edge.target) }
        if not item.key in related.at(edge.target) { related.at(edge.target).push(item.key) }
      }
    }
  }

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

#let render-concept-title(item) = context {
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

#let render-term-definition(item) = {
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
    let sources = if value.citation == none {
      none
    } else if type(value.citation) == array {
      value.citation.map(render-citation).filter(x => x != none).join()
    } else {
      render-citation(value.citation)
    }
    if sources == none { definition } else { [#definition~#sources] }
  }
}

#let render-citations(item) = {
  if item.citations.len() > 0 {
    let render-one(c) = {
      let lbl = resolve-citation-label(c)
      if lbl != none { cite(lbl) } else { none }
    }
    item.citations.map(render-one).filter(x => x != none).join()
  }
}

#let legacy-blocks(item, terms) = {
  let legacy = item.legacy
  let output = []
  let rendered = false

  let render-mode(intro, body, after, wrapper) = {
    let chunk = []
    if intro != none { chunk += intro(terms) }
    if body != none { chunk += body(terms) }
    if after != none { chunk += after(terms) }
    if chunk != [] {
      rendered = true
      if wrapper == none { chunk } else { wrapper(chunk) }
    }
  }

  if legacy.document_enabled {
    output += render-mode(legacy.document_intro, legacy.document_body, legacy.document_after, legacy.document_wrapper)
  }
  if legacy.theory_enabled {
    output += render-mode(legacy.theory_intro, legacy.theory_body, legacy.theory_after, legacy.theory_wrapper)
  }
  if legacy.practical_enabled {
    output += render-mode(legacy.practical_intro, legacy.practical_body, legacy.practical_after, legacy.practical_wrapper)
  }

  // Folder-section concepts historically carried content even when their
  // enabled flag was false. Preserve that content during migration, preferring
  // the general/theory surface and never duplicating disabled practical drafts.
  if not rendered {
    if legacy.document_intro != none or legacy.document_body != none or legacy.document_after != none {
      output += render-mode(legacy.document_intro, legacy.document_body, legacy.document_after, legacy.document_wrapper)
    } else if legacy.theory_intro != none or legacy.theory_body != none or legacy.theory_after != none {
      output += render-mode(legacy.theory_intro, legacy.theory_body, legacy.theory_after, legacy.theory_wrapper)
    }
  }

  output
}

#let legacy-summary(item, terms) = {
  let legacy = item.legacy
  if legacy.document_enabled and legacy.document_summary != none {
    legacy.document_summary(terms)
  } else if legacy.theory_enabled and legacy.theory_summary != none {
    legacy.theory_summary(terms)
  } else if legacy.practical_enabled and legacy.practical_summary != none {
    legacy.practical_summary(terms)
  } else if legacy.document_summary != none {
    legacy.document_summary(terms)
  } else if legacy.theory_summary != none {
    legacy.theory_summary(terms)
  } else {
    none
  }
}

#let render-concept(item, terms, graph, level: 1) = {
  let output = [#heading(level: level)[#finalized[#render-concept-title(item)]]]

  let definition = if item.definition != none { item.definition(terms) } else { render-term-definition(item) }
  if definition != none { output += definition }

  if item.description != none {
    output += item.description(terms)
  } else {
    output += legacy-blocks(item, terms)
  }

  if item.visual != none { output += item.visual(terms) }

  for example in order-local(item.examples, graph) {
    output += render-concept(example, terms, graph, level: level + 1)
  }
  for attachment in order-local(item.attachments, graph) {
    output += render-concept(attachment, terms, graph, level: level + 1)
  }

  let summary = if item.summary != none { item.summary(terms) } else { legacy-summary(item, terms) }
  if summary != none { output += summary }

  let citations = render-citations(item)
  if citations != none { output += [#citations] }

  output
}

#let render-folder(node, terms, graph, level: 1) = {
  let output = []
  let child-level = level

  if node.section != none {
    output += render-concept(node.section, terms, graph, level: level)
    child-level = level + 1
  }

  for item in order-local(node.concepts, graph) {
    output += render-concept(item, terms, graph, level: child-level)
  }
  for child in order-folders(node.children, graph) {
    output += render-folder(child, terms, graph, level: child-level)
  }
  output
}

#let render-folders(folders, terms, level: 1) = {
  let graph = semantic-graph(folders)
  let output = []
  for node in order-folders(folders, graph) {
    output += render-folder(node, terms, graph, level: level)
  }
  output
}
