#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "evaluation_limitations",
  czech: "Omezení evaluace",
  english: "Evaluation Limitations",
  definition: terms => [
Omezení evaluace vymezují, která tvrzení nelze z architektonického a implementačního ověření spolehlivě odvodit.
  ],
  description: terms => [
Práce nepředstavuje statistický benchmark úspěšnosti agentů, ceny, latence ani četnosti zacyklení na reprezentativním souboru úloh. Taková tvrzení vyžadují samostatný kontrolovaný experiment.

Výsledky proto hodnotí návrh a jeho technické ověření, nikoli obecnou výkonnostní převahu DarkFactory nad jinými agentními systémy.
  ],
  relations: ((type: "dependency", target: "research_question_evaluation"),),
)
