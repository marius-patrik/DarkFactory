#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "github_control_plane",
  industry: "GitHub Control Plane",
  czech: "GitHub jako řídicí vrstva",
  english: "GitHub Control Plane",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Použití GitHubu jako trvalé vrstvy pro repozitáře, pull requesty, kontroly, workflow a další stav řízeného vývojového procesu DarkFactory.
  ],
  description: terms => [
DarkFactory odděluje vlastní agentní runtime od trvalého vývojového stavu a oprávnění, která zůstávají reprezentována v GitHubu a jeho integračních rozhraních.
  ],
  relations: ((type: "dependency", target: "darkfactory_system"), (type: "related", target: "pull_request")),
)
