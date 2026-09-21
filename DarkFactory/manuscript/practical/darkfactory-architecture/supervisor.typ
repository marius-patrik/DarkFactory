#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "darkfactory_supervisor",
  industry: "Supervisor",
  czech: "Dohled nad během",
  english: "Execution Supervisor",
  citation: bib.darkfactory,
  source: bib.darkfactory,
  definition: terms => [
Komponenta vykonávacího jádra, která řídí jeden modelový běh nad uspořádanou množinou kandidátů a vynucuje jeho provozní hranice.
  ],
  description: terms => [
DarkFactory Supervisor spravuje failover mezi modely a poskytovateli, kvótové a rate-limit podmínky, maximální počet tahů, časový rozpočet běhu a capability-tier escalation. Selhaný kandidát může být nahrazen dalším bez opakování již přijatých deterministických účinků.
  ],
  relations: (
    (type: "dependency", target: "darkfactory_routing"),
    (type: "related", target: "agent_loop"),
    (type: "related", target: "goal_loops"),
  ),
)
