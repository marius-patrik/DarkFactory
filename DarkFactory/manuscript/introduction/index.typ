#import "/DarkFactory/schema.typ": folder
#import "/DarkFactory/manuscript/introduction/introduction.typ" as section
#import "/DarkFactory/manuscript/introduction/motivation/index.typ" as motivation
#import "/DarkFactory/manuscript/introduction/argument/index.typ" as argument
#import "/DarkFactory/manuscript/introduction/objectives/index.typ" as objectives
#import "/DarkFactory/manuscript/introduction/objectives/research-questions/index.typ" as research_questions
#import "/DarkFactory/manuscript/introduction/methodology/index.typ" as methodology

#let node = folder(
  key: "thesis_introduction",
  section: section.item,
  children: (
    motivation.node,
    argument.node,
    objectives.node,
    research_questions.node,
    methodology.node,
  ),
)
