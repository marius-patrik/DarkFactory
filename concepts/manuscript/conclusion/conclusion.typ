#import "../../templates/common.typ": define-term, translation, blue-note
#import "../../schema.typ": concept

#let terminology = define-term(
  id: "conclusion",
  proper: translation(cs: "Závěr", en: "Conclusion"),
  keyword: false,
)

#let item = concept(
  key: "conclusion",
  term: terminology,
  document_enabled: true,
  document_body: terms => [
#blue-note[
  Poznámka k vypracování závěru:
  Závěr práce bude sepsán jako poslední krok po definitivním ucelení teoretických východisek agentického inženýrství a detailní architektury agent harnessu. Tato závěrečná kapitola syntetizuje zjištění o deterministickém řízení autonomních agentů a zhodnotí formulované principy a výzkumné otázky bez vazby na dřívější ad-hoc testovací repozitáře.
]
  ],
)
