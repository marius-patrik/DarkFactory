#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/software-engineering/examples/karpathy-vibe-coding-tweet.typ" as karpathy_tweet
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "vibe_coding",
  industry: "Vibe Coding",
  czech: "Vibe Coding",
  english: "Vibe Coding",
  citation: (bib.karpathy2025vibecoding, bib.willison2025vibecoding),
  source: bib.karpathy2025vibecoding,
  definition: terms => [
Způsob tvorby softwaru, při kterém člověk zadává požadované chování přirozeným jazykem a iteruje nad výsledkem bez průběžné kontroly vygenerovaného kódu.
  ],
  description: terms => [
Termín zavedl Andrej Karpathy v roce 2025. Přístup urychluje experimentování, ale u udržovaného softwaru nenahrazuje kontrolu požadavků, testů a výsledného chování. #cite(bib.karpathy2025vibecoding) #cite(bib.willison2025vibecoding)
  ],
  examples: (karpathy_tweet.item,),
  relations: ((type: "related", target: "software_engineering"),),
)
