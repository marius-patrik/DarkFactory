#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/introduction/objectives/objectives.typ" as section
#import "/DarkFactory/manuscript/introduction/objectives/main-goal/index.typ" as main_goal
#import "/DarkFactory/manuscript/introduction/objectives/subgoals/index.typ" as subgoals

#let node = folder(
  key: "thesis_objectives",
  section: section.item,
  children: (
    main_goal.node,
    subgoals.node,
  ),
)
