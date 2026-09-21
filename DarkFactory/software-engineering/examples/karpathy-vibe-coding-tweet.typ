#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "karpathy_vibe_coding_tweet",
  term: "Původ termínu Vibe Coding",
  citation: (bib.karpathy2025vibecoding, bib.coderabbit2026vibehistory),
  source: bib.coderabbit2026vibehistory,
  definition: terms => [
Původní tweet Andreje Karpathyho, ve kterém v únoru 2025 pojmenoval „vibe coding“.
  ],
  description: terms => [
Tweet Andreje Karpathyho z 2. února 2025, ve kterém popsal původní význam Vibe Coding.
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/karpathy-vibe-coding.png", width: 92%),
  caption: [Původní tweet Andreje Karpathyho o Vibe Coding. #cite(bib.karpathy2025vibecoding) #cite(bib.coderabbit2026vibehistory)],
)
  ],
  relations: ((type: "related", target: "vibe_coding"),),
)
