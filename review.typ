#import "metadata.typ": meta
#import "lib/odborna-prace.typ": odborna-prace, prilohy, note, issue, alert, struct-alert, ai, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note, term, kw

// Recenzní verze práce (Review mode):
// Obsahuje veškeré postranní recenzní panely (note, issue, alert, critique, blue-note),
// textová zvýraznění (unconfirmed, added, confirmed), srovnávací diffy (červený přeškrtnutý text)
// a vodoznak KONCEPT.
#show: odborna-prace.with(
  meta: meta,
  logo: "/img/logo.jpeg",
  review: true,
  koncept: "KONCEPT",
)

#include "kapitoly/01-uvod.typ"
#include "kapitoly/02-teoreticka-cast.typ"
#include "kapitoly/03-prakticka-cast.typ"
#include "kapitoly/04-vysledky.typ"
#include "kapitoly/05-zaver.typ"

#show: prilohy
#include "kapitoly/06-prilohy.typ"
