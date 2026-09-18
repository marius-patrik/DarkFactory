#import "metadata.typ": meta
#import "lib/odborna-prace.typ": odborna-prace, prilohy, note, issue, alert, struct-alert, ai, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

#show: odborna-prace.with(
  meta: meta,
  logo: "/img/logo.jpeg",
  // Odstraňte, až bude text přepsán vlastními slovy.
  koncept: "KONCEPT",
  // Volitelné úpravy dle požadavků školy:
  // pismo: "Times New Roman",
  // velikost: 12pt,
  // radkovani: 1.5,
  // bib-styl: "iso-690-author-date",
)

#include "kapitoly/01-uvod.typ"
#include "kapitoly/02-teoreticka-cast.typ"
#include "kapitoly/03-prakticka-cast.typ"
#include "kapitoly/04-vysledky.typ"
#include "kapitoly/05-zaver.typ"

#show: prilohy
#include "kapitoly/06-prilohy.typ"
