#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/introduction/objectives/objectives.typ" as section
#import "/DarkFactory/manuscript/introduction/objectives/main-goal/index.typ" as main_goal
#import "/DarkFactory/manuscript/introduction/objectives/subgoals/index.typ" as subgoals
#import "/DarkFactory/manuscript/introduction/objectives/research-questions/index.typ" as research_questions

#let node = folder(
  key: "thesis_objectives_research_questions",
  section: section.item,
  children: (
    main_goal.node,
    subgoals.node,
    research_questions.node,
  ),
)
