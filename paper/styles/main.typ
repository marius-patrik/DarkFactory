// Style entry point.
//
// `index.typ` imports this file and nothing else, then applies everything with a
// single `#show: apply`.
//
// Why `apply` and not a pile of `#set` rules at the top of the document: a `set` or
// `show` rule written inside an imported module applies to that module's own content
// and does not reach the file that imported it. Styling therefore has to be a
// *function* that wraps the document's content. `apply` is that function, and the
// `#show: apply` in `index.typ` is what makes it reach the text.
//
// One concern per file, each file named after its concern:
//
//   fonts.typ     which typefaces the document uses
//   metadata.typ  the facts printed in the front matter
//   page.typ      sheet size and margins
//   footer.typ    the running footer, off until the body starts
//   body.typ      the face, size, language and paragraph rhythm
//   headings.typ  heading numbering, page-break policy, unnumbered headings
//   lists.typ     bulleted and numbered lists
//   code.typ      block and inline code
//   links.typ     link colour
//   tables.typ    table rules
//   figures.typ   figure numbering and captions
//   draft.typ     the marking used on provisional passages
//
// A style belongs in its own file rather than in a neighbour whenever it could be
// turned on or off on its own. That is why the footer is a value the document sets
// rather than a rule applied here, and why `draft[]` is a helper the document calls
// rather than a global setting.
//
// The nesting order below is the order the rules take effect. `page` and `body` are
// outermost because they establish what everything else inherits; `figures` is
// innermost because caption styling is the last thing to override.

#import "fonts.typ": PISMO, MONO
#import "metadata.typ": meta
#import "page.typ": page-setup
#import "footer.typ": page-footer
#import "body.typ": body-text
#import "headings.typ": apply as style-headings, nadpis-bez-cisla
#import "lists.typ": apply as style-lists
#import "code.typ": apply as style-code
#import "links.typ": apply as style-links
#import "tables.typ": apply as style-tables
#import "figures.typ": apply as style-figures
#import "draft.typ": draft, draft-inline

#let apply(body) = page-setup(
  body-text(
    style-headings(
      style-lists(
        style-code(
          style-links(
            style-tables(
              style-figures(body),
            ),
          ),
        ),
      ),
    ),
  ),
)
