#import "../src/lib.typ": confirmed, unconfirmed, diff, bilingual, bullet-list

= Template smoke test

#confirmed[Confirmed text]

#unconfirmed[Unconfirmed text]

#diff[Old text][New text]

#bilingual([Český text], [English text])

#bullet-list(
  [First item],
  [Second item],
)
