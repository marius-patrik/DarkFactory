#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/results/results.typ" as section
#import "/DarkFactory/manuscript/results/evaluation-snapshot.typ" as snapshot
#import "/DarkFactory/manuscript/results/verified-implementation-state.typ" as verified
#import "/DarkFactory/manuscript/results/research-question-evaluation.typ" as questions
#import "/DarkFactory/manuscript/results/evaluation-limitations.typ" as limitations

#let node = folder(
  key: "results_discussion",
  section: section.item,
  concepts: (
    snapshot.item,
    verified.item,
    questions.item,
    limitations.item,
  ),
)
