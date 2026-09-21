#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section

#let item = section(
  key: "darkfactory_identity_security_body",
  title: [Identita a bezpečnostní hranice],
  definition: terms => [
DarkFactory odděluje strojovou identitu a tajné credentials používané runtime od lidské identity používané webovým rozhraním.
  ],
  description: terms => [
`@darkfactory/keychain` je jediným vlastníkem strojových credentials, tokenů, GitHub App private-key operací, redakce a související diagnostiky. `@darkfactory/auth` naproti tomu poskytuje browser-safe autentizaci uživatele a session pro DarkFactory Web; browserová část nesmí importovat machine-secret implementace. #cite(bib.darkfactory)
  ],
)
