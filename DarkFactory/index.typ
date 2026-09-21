#import "/DarkFactory/schema.typ": folder, build-vocabulary, collect-concepts, render-folders
#import "/DarkFactory/templates/common.typ": translation
#import "/DarkFactory/manuscript/introduction/index.typ" as introduction
#import "/DarkFactory/manuscript/theory/index.typ" as theory
#import "/DarkFactory/manuscript/practical/index.typ" as practical
#import "/DarkFactory/manuscript/conclusion/index.typ" as conclusion
#import "/DarkFactory/manuscript/appendices/index.typ" as appendices

#let manuscript-folders = (
  introduction.node,
  theory.node,
  practical.node,
  conclusion.node,
)

#let appendix-folders = (appendices.node,)

#let root = folder(
  key: "DarkFactory",
  title: translation(cs: "DarkFactory", en: "DarkFactory"),
  children: manuscript-folders + appendix-folders,
)

#let folders = root.children
#let book-title = root.title
#let vocabulary = build-vocabulary(folders)
#let concepts = collect-concepts(folders)

#let render-manuscript() = render-folders(manuscript-folders, vocabulary, level: 1)
#let render-appendices() = render-folders(appendix-folders, vocabulary, level: 1)
