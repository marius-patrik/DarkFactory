#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_request",
  industry: "Request",
  czech: "Požadavek DarkFactory",
  english: "DarkFactory Request",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Trvale evidovaná jednotka práce, která zachovává původní zadání a stav doručení před zahájením implementace.
  ],
  description: terms => [
DarkFactory váže řízenou práci na Request reprezentovaný v GitHubu a používá jeho verzi, acceptance criteria a vztahy jako vstup do Planning a následného životního cyklu.
  ],
  relations: ((type: "dependency", target: "github_control_plane"),),
)
