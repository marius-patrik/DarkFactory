#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "container",
  industry: "Container",
  czech: "Softwarový kontejner",
  english: "Software Container",
  citation: bib.docker_containers_docs,
  source: bib.docker_containers_docs,
  definition: terms => [
Izolovaný proces s vlastním uživatelským prostředím a soubory potřebnými pro běh aplikace, který sdílí jádro hostitelského operačního systému. #cite(bib.docker_containers_docs)
  ],
  description: terms => [
Kontejner umožňuje balit aplikaci a její závislosti do přenositelného běhového prostředí, ale neposkytuje stejnou izolační hranici jako samostatný virtuální stroj. #cite(bib.docker_containers_docs)
  ],
  relations: ((type: "related", target: "runtime"),),
)
