#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/evaluation-limitations.typ" as limitations

#let node = folder(
  key: "results_discussion",
  section: section.item,
  concepts: (
    questions.item,
    limitations.item,
  ),
)
