#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "container",
  industry: "Container",
  czech: "Softwarový kontejner",
  english: "Software Container",
  citation: (bib.docker_containers_docs, bib.oci_runtime_spec),
  source: bib.oci_runtime_spec,
  definition: terms => [
Izolované procesové prostředí vytvořené podle definované konfigurace a pravidel životního cyklu, ve kterém běží aplikace se svými potřebnými soubory a závislostmi. #cite(bib.oci_runtime_spec)
  ],
  description: terms => [
Kontejnery poskytují oddělené uživatelské prostředí při sdílení jádra hostitelského operačního systému a usnadňují přenositelné zabalení aplikace a jejích závislostí. #cite(bib.docker_containers_docs)
  ],
  relations: ((type: "parent", target: "runtime"),),
)
