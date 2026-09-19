#import "metadata.typ": meta
#import "lib/odborna-prace.typ": odborna-prace, prilohy, note, issue, alert, struct-alert, ai, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note, term, kw

// Čistá / raw verze práce: kompiluje se bez recenzních značek (calloutů), bez textu diffu
// (zobrazuje pouze finální nový text bez zvýraznění) a bez vodoznaku.
// Pro recenzní verzi spusťte `typst compile review.typ` nebo předejte argument `--input review=true`.
#show: odborna-prace.with(
  meta: meta,
  logo: "/img/logo.jpeg",
  review: sys.inputs.at("review", default: "false") in ("true", "1", "yes"),
  koncept: if sys.inputs.at("review", default: "false") in ("true", "1", "yes") { "KONCEPT" } else { none },
)

#include "kapitoly/01-uvod.typ"
#include "kapitoly/02-teoreticka-cast.typ"
#include "kapitoly/03-prakticka-cast.typ"
#include "kapitoly/04-vysledky.typ"
#include "kapitoly/05-zaver.typ"

#show: prilohy
#include "kapitoly/06-prilohy.typ"
