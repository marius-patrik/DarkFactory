#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/evaluation-method.typ" as method_section
#import "/DarkFactory/manuscript/results/technical-results.typ" as technical_results_section
#import "/DarkFactory/manuscript/results/end-to-end-evaluation.typ" as end_to_end_section
#import "/DarkFactory/manuscript/results/target-repository-evaluation.typ" as target_repositories_section
#import "/DarkFactory/manuscript/results/discussion.typ" as discussion_section
#import "/DarkFactory/manuscript/results/goal-question-section.typ" as goal_question_section
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/evaluation-limitations.typ" as limitations

#let method = folder(
  key: "evaluation_method",
  title: [Metoda ověření],
  section: method_section.item,
)

#let technical_results = folder(
  key: "technical_results",
  title: [Technické výsledky],
  section: technical_results_section.item,
)

#let end_to_end = folder(
  key: "end_to_end_evaluation",
  title: [End-to-end ověření],
  section: end_to_end_section.item,
)

#let target_repositories = folder(
  key: "target_repository_evaluation",
  title: [Ověření na cílových repozitářích],
  section: target_repositories_section.item,
)

#let goal_evaluation = folder(
  key: "goal_and_question_evaluation",
  title: [Vyhodnocení cílů a výzkumných otázek],
  section: goal_question_section.item,
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
  section: discussion_section.item,
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
