#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/evaluation-limitations.typ" as limitations

#let method = folder(
  key: "evaluation_method",
  title: [Metoda ověření],
)

#let technical_results = folder(
  key: "technical_results",
  title: [Technické výsledky],
)

#let end_to_end = folder(
  key: "end_to_end_evaluation",
  title: [End-to-end ověření],
)

#let target_repositories = folder(
  key: "target_repository_evaluation",
  title: [Ověření na cílových repozitářích],
)

#let goal_evaluation = folder(
  key: "goal_and_question_evaluation",
  title: [Vyhodnocení cílů a výzkumných otázek],
  concepts: (questions.item,),
)

#let evaluation_limits = folder(
  key: "evaluation_limits",
  title: [Omezení],
  concepts: (limitations.item,),
)

#let discussion = folder(
  key: "results_discussion_section",
  title: [Diskuse],
)

#let node = folder(
  key: "results_discussion",
  title: [Výsledky a diskuse],
  section: section.item,
  children: (
    method,
    technical_results,
    end_to_end,
    target_repositories,
    goal_evaluation,
    evaluation_limits,
    discussion,
  ),
)
