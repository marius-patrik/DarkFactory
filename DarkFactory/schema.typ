#import "/DarkFactory/templates/common.typ": finalized, term, render-translation, resolve-citation-label, profile-state

#let relation(type, target) = {
  assert(type in ("dependency", "related"), message: "unsupported semantic relation: " + type)
  assert(target != none, message: "concept relation requires a target")
  (type: type, target: target)
}

#let concept(
  key: none,
  industry: none,
  czech: none,
  english: none,
  alias: none,
  title: none,
  citation: none,
  source: none,
  definition: none,
  description: none,
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
) = {
  assert(key != none, message: "concept requires a stable key")
  assert(czech != none or english != none or industry != none, message: "concept requires canonical terminology")
  assert(definition != none, message: "concept requires a definition")
  assert(description != none, message: "concept requires a description")
  assert(summary != none, message: "concept requires a summary")
  (
    kind: "concept",
    key: key,
    industry: industry,
    czech: czech,
    english: english,
    alias: alias,
    title: title,
    citation: citation,
    source: source,
    definition: definition,
    description: description,
    summary: summary,
    visual: visual,
    examples: examples,
    attachments: attachments,
    citations: citations,
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
    result.insert(item.key, item)
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
  if item.title != none {
    render-translation(item.title, language: "auto", school-both: false)
  } else {
    term(item, surface: "full", linked: false, marker: false, emphasized: false)
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

#let render-concept(item, terms, graph, level: 1) = {
  let output = context [#heading(level: level)[#finalized[#render-concept-title(item)]]#label("concept-" + item.key)]

  output += [
    #set par(first-line-indent: (amount: 1.5em, all: true))
    #(item.definition)(terms)
  ]
  output += (item.description)(terms)
  if item.visual != none { output += (item.visual)(terms) }

  for example in order-local(item.examples, graph) {
    output += render-concept(example, terms, graph, level: level + 1)
  }
  for attachment in order-local(item.attachments, graph) {
    output += render-concept(attachment, terms, graph, level: level + 1)
  }

  output += (item.summary)(terms)

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
