// Part title card and chapter 3 opener.
//
// The card is centred in the text area with `center + horizon`. It used a leading
// `#v(1fr)`, which pushed the two lines to the bottom of the page where "DarkFactory"
// printed on top of the page number. `1fr` before the content and none after it
// bottom-aligns; centring needs the flag.
#pagebreak(weak: true)
#align(center + horizon)[
  #set par(justify: false)
  #text(size: 15pt, tracking: 2pt)[PRAKTICKÁ ČÁST]
  #v(0.8cm)
  #text(size: 24pt, weight: "bold", hyphenate: false)[DarkFactory]
]
#pagebreak(weak: true)


#heading(level: 1)[Praktická část]
