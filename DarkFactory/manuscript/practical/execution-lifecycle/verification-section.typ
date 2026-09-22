#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "change_verification_review_body",
  title: [Ověření a revize],
  definition: terms => [
Po implementaci se skutečný výsledek změny odvodí z pozorovatelných důkazů a samostatně se zkontroluje jeho správnost.
  ],
  description: terms => [
Deterministické ověření pracuje se změněnými soubory, rozsahem a výsledky verifikačních akcí. Review/Fix Loop zachycuje zjištění a případné opravy; každá materiální oprava musí znovu projít odpovídajícím ověřením. #cite(bib.darkfactory)
  ],
)
