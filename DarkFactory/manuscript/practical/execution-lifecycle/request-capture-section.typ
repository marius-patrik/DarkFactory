#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_request_capture_body",
  title: [Zachycení požadavku],
  definition: terms => [
Řízený životní cyklus začíná zachycením původního zadání do trvalého Requestu před zahájením implementace.
  ],
  description: terms => [
Request zachovává verbatim znění zadání, relevantní kontext a explicitní vztahy k další práci. Tím vzniká trvalý referenční bod pro následný Planning a pro pozdější kontrolu, zda implementace stále odpovídá schválenému záměru. #cite(bib.darkfactory)
  ],
)
