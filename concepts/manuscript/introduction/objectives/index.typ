#import "../../../schema.typ": folder
#import "objectives.typ" as section
#import "main-goal/index.typ" as main_goal
#import "subgoals/index.typ" as subgoals
#import "research-questions/index.typ" as research_questions

#let node = folder(
  key: "thesis_objectives_research_questions",
  section: section.item,
  children: (
    main_goal.node,
    subgoals.node,
    research_questions.node,
  ),
)
