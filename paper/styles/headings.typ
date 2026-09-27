// Headings.
//
// These rules carry document policy, not only looks. A level-1 heading opens a page.
// A level-2 heading opens one too, *except* where it must sit directly under the part
// opener it belongs to. The exemptions are named here, beside the rule that reads
// them, so the policy is stated once.

#let apply(body) = {
  set heading(numbering: "1.1")

  // Level-1 heading that continues its part instead of opening a new page.
  // <results-section> is defined on the chapter-4 opener in 40-results.typ; without this
  // exemption the results would begin a page of their own.
  let continuing-section = <results-section>

  // Level-2 headings that must not be pushed onto a fresh page, because they open
  // the first subsection of their part. Every entry here must name a label that
  // actually exists: a stale entry silently stops exempting anything, and a missing
  // one leaves a near-blank page between the part opener and its first subsection.
  let inline-openers = (
    <intro-goal>,
    <theory-first>,
    <practical-first>,
    <results-first>,
  )

  show heading.where(level: 1): it => {
    if it.at("label", default: none) != continuing-section {
      pagebreak(weak: true)
    }
    block(above: 21pt, below: 10pt, sticky: true, text(size: 16pt, weight: "bold", it))
  }

  show heading.where(level: 2): it => {
    if it.at("label", default: none) not in inline-openers {
      pagebreak()
    }
    block(above: 19pt, below: 9pt, sticky: true, text(size: 14pt, weight: "bold", it))
  }

  show heading.where(level: 3): it => block(
    above: 17pt,
    below: 8pt,
    sticky: true,
    text(size: 12pt, weight: "bold", it),
  )

  body
}

// An unnumbered, unlisted heading, for the front and back matter that must stay out
// of the outline. It is a level-1 heading, so it opens a page like any other.
#let nadpis-bez-cisla(text-nadpisu) = heading(
  numbering: none,
  outlined: true,
  bookmarked: false,
  text-nadpisu,
)
