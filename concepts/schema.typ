#import "../templates/common.typ": finalized

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
  related: (),
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
    related: related,
  )
}

#let section(
  key: none,
  term: none,
  heading: none,
  theory_prelude: none,
  theory_intro_heading: none,
  theory_intro: none,
  theory_summary: none,
  practical_prelude: none,
  practical_intro_heading: none,
  practical_intro: none,
  practical_summary: none,
  practical_grouped: false,
  concepts: (),
) = {
  assert(key != none, message: "section requires a stable key")
  assert(term != none, message: "section requires canonical terminology")
  assert(heading != none, message: "section requires a heading renderer")
  (
    kind: "section",
    key: key,
    term: term,
    heading: heading,
    theory_prelude: theory_prelude,
    theory_intro_heading: theory_intro_heading,
    theory_intro: theory_intro,
    theory_summary: theory_summary,
    practical_prelude: practical_prelude,
    practical_intro_heading: practical_intro_heading,
    practical_intro: practical_intro,
    practical_summary: practical_summary,
    practical_grouped: practical_grouped,
    concepts: concepts,
  )
}

#let render-concept(item, terms, mode: "theory", level: 3) = {
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

#let all-concepts(sections) = {
  let result = ()
  for section in sections {
    for item in section.concepts {
      result.push(item)
    }
  }
  result
}

#let build-vocabulary(sections) = {
  let result = (:)
  for section in sections {
    assert(not section.key in result, message: "duplicate section key: " + section.key)
    result.insert(section.key, section.term)
    for item in section.concepts {
      assert(not item.key in result, message: "duplicate concept key: " + item.key)
      result.insert(item.key, item.term)
    }
  }
  result
}

#let render-theory-chapter(sections, terms) = {
  let output = [
    #heading(level: 1)[#finalized[Agentické AI: Vymezení konceptů - Teoretická část]]
    #finalized[Úvod]
  ]

  for section in sections {
    output += [#heading(level: 2)[#(section.heading)(terms)]]
    if section.theory_prelude != none { output += (section.theory_prelude)(terms) }
    if section.theory_intro_heading != none {
      output += [#heading(level: 3)[#(section.theory_intro_heading)(terms)]]
    }
    if section.theory_intro != none { output += (section.theory_intro)(terms) }

    for item in section.concepts {
      let rendered = render-concept(item, terms, mode: "theory", level: 3)
      if rendered != none { output += rendered }
    }

    if section.theory_summary != none { output += (section.theory_summary)(terms) }
  }

  output
}

#let render-practical-chapter(sections, terms) = {
  let output = [
    #heading(level: 1)[#finalized[DarkFactory: Architektura harnessu - Praktická část]]
    #finalized[Úvod]
  ]

  for section in sections {
    let active = section.concepts.filter(item => item.practical_enabled)
    if active.len() > 0 {
      if section.practical_prelude != none { output += (section.practical_prelude)(terms) }

      if section.practical_grouped {
        output += [#heading(level: 2)[#(section.heading)(terms)]]
        if section.practical_intro_heading != none {
          output += [#heading(level: 3)[#(section.practical_intro_heading)(terms)]]
        }
        if section.practical_intro != none { output += (section.practical_intro)(terms) }
        for item in active {
          let rendered = render-concept(item, terms, mode: "practical", level: 3)
          if rendered != none { output += rendered }
        }
      } else {
        if section.practical_intro != none { output += (section.practical_intro)(terms) }
        for item in active {
          let rendered = render-concept(item, terms, mode: "practical", level: 2)
          if rendered != none { output += rendered }
        }
      }

      if section.practical_summary != none { output += (section.practical_summary)(terms) }
    }
  }

  output
}
