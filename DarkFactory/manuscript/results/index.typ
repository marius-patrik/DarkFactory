#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/evaluation-method.typ" as introduction
#import "/DarkFactory/manuscript/results/technical-results.typ" as mechanisms
#import "/DarkFactory/manuscript/results/end-to-end-evaluation.typ" as system
#import "/DarkFactory/manuscript/results/target-repository-evaluation.typ" as repositories
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/discussion.typ" as discussion
#import "/DarkFactory/manuscript/results/conclusion.typ" as conclusion

#let intro = folder(
  key: "evaluation_intro",
  section: introduction.item,
)

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

#let close = folder(
  key: "evaluation_conclusion",
  section: conclusion.item,
)

#let node = folder(
  key: "evaluation",
  title: [Vyhodnocení],
  section: section.item,
  children: (
    intro,
    mechanism_verification,
    system_verification,
    repository_verification,
    research_questions,
    discussion_limits,
    close,
  ),
)
