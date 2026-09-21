#import "/DarkFactory/templates/common.typ": term-full-name, resolve-citation-label

#let relation(type, target) = {
  assert(type in ("dependency", "related", "parent", "child"), message: "unsupported semantic relation: " + type)
  assert(target != none, message: "concept relation requires a target")
  (type: type, target: target)
}

#let concept(
  key: none,
  industry: none,
  czech: none,
  english: none,
  alias: none,
  keyword: false,
  citation: none,
  source: none,
  definition: none,
  description: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: (),
) = {
  assert(key != none, message: "concept requires a stable key")
  assert(czech != none or english != none or industry != none, message: "concept requires canonical terminology")
  assert(type(keyword) == bool, message: "concept keyword must be a boolean")
  assert(definition != none, message: "concept requires a definition")
  assert(description != none, message: "concept requires a description")
  (
    kind: "concept",
    key: key,
    industry: industry,
    czech: czech,
    english: english,
    alias: alias,
    keyword: keyword,
    citation: citation,
    source: source,
    definition: definition,
    description: description,
    visual: visual,
    examples: examples,
    attachments: attachments,
    citations: citations,
    relations: relations,
  )
}

#let section(
  key: none,
  title: none,
  definition: none,
  description: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
) = {
  assert(key != none, message: "section requires a stable key")
  assert(title != none, message: "section requires a title")
  assert(definition != none, message: "section requires an introductory definition/body")
  assert(description != none, message: "section requires an introductory description/body")
  (
    kind: "section",
    key: key,
    title: title,
    definition: definition,
    description: description,
    visual: visual,
    examples: examples,
    attachments: attachments,
    citations: citations,
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
  // Folder sections are structural and numbered; only semantic concepts enter
  // the vocabulary and semantic graph. Examples/attachments owned by a section
  // are still semantic concepts and must remain addressable.
  if node.section != none {
    for item in node.section.examples { result += collect-concept(item) }
    for item in node.section.attachments { result += collect-concept(item) }
  }
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
  let parents = (:)
  let children = (:)
  for item in concepts {
    dependencies.insert(item.key, ())
    related.insert(item.key, ())
    parents.insert(item.key, ())
    children.insert(item.key, ())
  }

  for item in concepts {
    for edge in item.relations {
      assert(edge.type in ("dependency", "related", "parent", "child"), message: "unsupported semantic relation " + edge.type + " on " + item.key)
      assert(edge.target in keys, message: "unknown relation target " + edge.target + " from " + item.key)
      if edge.type == "dependency" {
        if not edge.target in dependencies.at(item.key) { dependencies.at(item.key).push(edge.target) }
      } else if edge.type == "related" {
        if not edge.target in related.at(item.key) { related.at(item.key).push(edge.target) }
        if not item.key in related.at(edge.target) { related.at(edge.target).push(item.key) }
      } else if edge.type == "parent" {
        if not edge.target in parents.at(item.key) { parents.at(item.key).push(edge.target) }
        if not item.key in children.at(edge.target) { children.at(edge.target).push(item.key) }
      } else {
        if not edge.target in children.at(item.key) { children.at(item.key).push(edge.target) }
        if not item.key in parents.at(edge.target) { parents.at(edge.target).push(item.key) }
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

  let owned = ()
  let ownership-remaining = keys
  while ownership-remaining.len() > 0 {
    let progressed = false
    for key in ownership-remaining {
      if parents.at(key).all(parent => parent in owned or not parent in ownership-remaining) {
        owned.push(key)
        ownership-remaining = ownership-remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "parent/child cycle in concept graph")
  }

  (dependencies: dependencies, related: related, parents: parents, children: children)
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
  // Structural order is explicit in each folder manifest. Semantic dependencies
  // order concepts inside a section, not numbered document sections.
  nodes
}

#let render-concept-title(item) = {
  if item.industry != none {
    term-full-name(item)
  } else if item.czech != none {
    item.czech
  } else {
    item.english
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

#let render-inline-example(item, terms, graph) = {
  let output = if item.visual != none {
    [#block[#(item.description)(terms)]#label("concept-" + item.key)]
  } else {
    [
      #block[
        #term-full-name(item). #(item.definition)(terms)
      ]#label("concept-" + item.key)
      #(item.description)(terms)
    ]
  }
  if item.visual != none { output += (item.visual)(terms) }

  for example in order-local(item.examples, graph) {
    output += render-inline-example(example, terms, graph)
  }
  for attachment in order-local(item.attachments, graph) {
    output += render-inline-example(attachment, terms, graph)
  }

  let citations = render-citations(item)
  if citations != none { output += [#citations] }
  output
}

#let render-concept(item, terms, graph, level: 1, title: none) = {
  let heading-title = if title != none { title } else { render-concept-title(item) }
  let output = [#heading(level: level, numbering: none, outlined: true)[#heading-title]#label("concept-" + item.key)]

  output += [
    #set par(first-line-indent: (amount: 1.5em, all: true))
    #(item.definition)(terms)
  ]
  output += (item.description)(terms)
  if item.visual != none { output += (item.visual)(terms) }

  for example in order-local(item.examples, graph) {
    output += render-inline-example(example, terms, graph)
  }
  for attachment in order-local(item.attachments, graph) {
    output += render-concept(attachment, terms, graph, level: level + 1)
  }

  let citations = render-citations(item)
  if citations != none { output += [#citations] }

  output
}

#let render-section-body(item, terms, graph) = {
  let output = [
    #set par(first-line-indent: (amount: 1.5em, all: true))
    #(item.definition)(terms)
  ]
  output += (item.description)(terms)
  if item.visual != none { output += (item.visual)(terms) }
  for example in order-local(item.examples, graph) {
    output += render-inline-example(example, terms, graph)
  }
  let citations = render-citations(item)
  if citations != none { output += [#citations] }
  output
}

#let render-folder(node, terms, graph, level: 1) = {
  let output = []
  let child-level = level
  let has-section = node.title != none or node.section != none

  if has-section {
    let heading-title = if node.title != none {
      node.title
    } else if node.section.kind == "section" {
      node.section.title
    } else {
      render-concept-title(node.section)
    }
    output += [#heading(level: level)[#heading-title]#label("section-" + node.key)]
    child-level = level + 1
    if node.section != none {
      output += render-section-body(node.section, terms, graph)
    }
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
