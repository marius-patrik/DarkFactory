#import "../templates/common.typ": finalized

#let relation(type, target) = {
  assert(type in ("parent", "child", "dependency", "related"), message: "unsupported concept relation: " + type)
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

#let build-vocabulary(concepts) = {
  let result = (:)
  for item in concepts {
    assert(not item.key in result, message: "duplicate concept key: " + item.key)
    result.insert(item.key, item.term)
  }
  result
}

#let normalize-relations(concepts) = {
  let keys = concepts.map(item => item.key)
  let parents = (:)
  let dependencies = (:)
  let related = (:)
  for item in concepts {
    parents.insert(item.key, ())
    dependencies.insert(item.key, ())
    related.insert(item.key, ())
  }

  for item in concepts {
    for edge in item.relations {
      assert(edge.target in keys, message: "unknown relation target " + edge.target + " from " + item.key)
      if edge.type == "parent" {
        parents.at(item.key).push(edge.target)
      } else if edge.type == "child" {
        parents.at(edge.target).push(item.key)
      } else if edge.type == "dependency" {
        dependencies.at(item.key).push(edge.target)
      } else if edge.type == "related" {
        related.at(item.key).push(edge.target)
      }
    }
  }

  for item in concepts {
    assert(parents.at(item.key).len() <= 1, message: "concept has multiple structural parents: " + item.key)
  }

  (parents: parents, dependencies: dependencies, related: related)
}

#let ordered-keys(concepts, graph) = {
  let keys = concepts.map(item => item.key)
  let result = ()
  let remaining = keys
  while remaining.len() > 0 {
    let progressed = false
    for key in remaining {
      let deps = graph.dependencies.at(key)
      if deps.all(dep => dep in result or not dep in remaining) {
        result.push(key)
        remaining = remaining.filter(candidate => candidate != key)
        progressed = true
        break
      }
    }
    assert(progressed, message: "dependency cycle in concept graph")
  }
  result
}

#let render-concept(item, terms, mode: "theory", level: 2) = {
  let enabled = if mode == "theory" { item.theory_enabled } else { item.practical_enabled }
  if enabled {
    let intro = if mode == "theory" { item.theory_intro } else { item.practical_intro }
    let body = if mode == "theory" { item.theory_body } else { item.practical_body }
    let summary = if mode == "theory" { item.theory_summary } else { item.practical_summary }
    let after = if mode == "theory" { item.theory_after } else { item.practical_after }
    let wrapper = if mode == "theory" { item.theory_wrapper } else { item.practical_wrapper }
    let core = [#heading(level: level)[#(item.heading)(terms)]]
    if intro != none { core += intro(terms) }
    if body != none { core += body(terms) }
    if summary != none { core += summary(terms) }
    let output = if wrapper == none { core } else { wrapper(core) }
    if after != none { output += after(terms) }
    output
  }
}

#let render-graph(concepts, terms, mode: "theory") = {
  let graph = normalize-relations(concepts)
  let order = ordered-keys(concepts, graph)
  let by-key = (:)
  for item in concepts { by-key.insert(item.key, item) }

  let render-node(key, level) = {
    let output = render-concept(by-key.at(key), terms, mode: mode, level: level)
    for child in order.filter(candidate => graph.parents.at(candidate).len() == 1 and graph.parents.at(candidate).first() == key) {
      let child-output = render-node(child, level + 1)
      if child-output != none { output += child-output }
    }
    output
  }

  let output = []
  for key in order.filter(candidate => graph.parents.at(candidate).len() == 0) {
    let rendered = render-node(key, 2)
    if rendered != none { output += rendered }
  }
  output
}

#let render-theory-chapter(concepts, terms) = [
  #heading(level: 1)[#finalized[Agentické AI: Vymezení konceptů - Teoretická část]]
  #finalized[Úvod]
  #render-graph(concepts, terms, mode: "theory")
]

#let render-practical-chapter(concepts, terms) = [
  #heading(level: 1)[#finalized[DarkFactory: Architektura harnessu - Praktická část]]
  #finalized[Úvod]
  #render-graph(concepts, terms, mode: "practical")
]
