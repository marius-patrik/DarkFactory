#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/software-engineering/examples/karpathy-vibe-coding-tweet.typ" as karpathy_tweet
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "vibe_coding",
  keyword: "Vibe Coding",
  citation: (bib.karpathy2025vibecoding, bib.willison2025vibecoding),
  source: bib.karpathy2025vibecoding,
  definition: terms => [
Způsob tvorby softwaru, při kterém člověk iteruje pomocí pokynů v přirozeném jazyce bez průběžné kontroly vygenerovaného kódu. #cite(bib.karpathy2025vibecoding)
  ],
  description: terms => [
Termín zavedl Andrej Karpathy v roce 2025. V této práci slouží jako kontrast k postupům, které před delegováním práce explicitně formulují specifikaci, plán a podmínky ověření. #cite(bib.karpathy2025vibecoding) #cite(bib.willison2025vibecoding)
  ],
  examples: (karpathy_tweet.item,),  relations: (),
)
