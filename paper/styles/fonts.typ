// Typefaces.
//
// The single place a typeface is chosen. Everything that sets a font imports from
// here, so the document can be retypeset by editing this file alone.

// Thesis face. Caladea is metrically compatible with Cambria and ships in ../components/fonts;
// New Computer Modern is the fallback Typst resolves on its own.
#let PISMO = ("Caladea", "New Computer Modern")

// Code face. DejaVu Sans Mono ships with Typst, so it needs no font file here.
#let MONO = ("DejaVu Sans Mono",)
