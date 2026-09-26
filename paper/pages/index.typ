// Structure of the document: the order of the pages.
//
// This file contains no thesis text. It only says what comes after what, and where the
// page numbers begin. The text itself is in the sibling files, the styling is in
// ../styles.
//
// The numeric prefixes mirror the document's own numbering, so the reading order of
// this directory is the reading order of the thesis.
//
// This file is `index.typ` because it is the conventional description of the directory
// it sits in: the package entry that pulls the whole thesis together is ../main.typ.

#import "../styles/main.typ": page-footer

// ── front matter, unnumbered ─────────────────────────────
#include "00-title.typ"
#include "01-declaration.typ"
#include "02-annotation.typ"
#include "03-outline.typ"

// ── body, numbered from here on ──────────────────────────
#set page(footer: page-footer)

#include "10-intro.typ"
#include "12-intro-terminology.typ"
#include "20-theory.typ"
#include "21-theory-language.typ"
#include "22-theory-harness.typ"
#include "23-theory-agentic.typ"
#include "24-theory-factory.typ"

#include "30-practical.typ"
#include "31-practical-method.typ"
#include "32-practical-architecture.typ"
#include "33-practical-planning.typ"
#include "34-practical-implementation.typ"
#include "35-practical-integration.typ"

#include "40-results.typ"
#include "41-discussion.typ"
#include "50-conclusion.typ"

// ── back matter ──────────────────────────────────────────
#include "90-bibliography.typ"
#include "91-figure-list.typ"
