#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/technical-results.typ" as mechanisms
#import "/DarkFactory/manuscript/results/end-to-end-evaluation.typ" as system
#import "/DarkFactory/manuscript/results/target-repository-evaluation.typ" as repositories
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/discussion.typ" as discussion

#let mechanism_verification = folder(
  key: "mechanism_verification",
  title: [Ověření mechanismů],
  section: mechanisms.item,
)

#let system_verification = folder(
  key: "system_verification",
  title: [Ověření systému],
  section: system.item,
)

#let repository_verification = folder(
  key: "repository_verification",
  title: [Ověření na repozitářích],
  section: repositories.item,
)

#let research_questions = folder(
  key: "research_question_answers",
  title: [Výzkumné otázky],
  section: questions.item,
)

#let discussion_limits = folder(
  key: "evaluation_discussion_limits",
  title: [Diskuse a omezení],
  section: discussion.item,
)

#let node = folder(
  key: "evaluation",
  section: section.item,
  children: (
    mechanism_verification,
    system_verification,
    repository_verification,
    research_questions,
    discussion_limits,
  ),
)
