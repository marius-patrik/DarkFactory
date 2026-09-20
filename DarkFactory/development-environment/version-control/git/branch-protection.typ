#import "/DarkFactory/templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw, bib
#import "/DarkFactory/schema.typ": concept

#let terminology = define-term(id: "branch-protection", proper: translation(cs: "Ochrana větví", en: "Branch Protection"), explanation_cs: "Pravidla repozitáře, která omezují přímé změny chráněných větví a vynucují schválení, kontroly nebo jiné podmínky před sloučením.", explanation_en: "Repository rules that restrict direct changes to protected branches and enforce approvals, checks, or other conditions before merging.", keyword: false, citation: bib.chacon2014, source: bib.dabbish2012github)

#let item = concept(
  key: "branch_protection",
  term: terminology,
  definition: none,
  description: terms => [
GitHub poskytuje pravidla ochrany větví #diff[(_Branch Protection Rules_)][(_Branch Protection Rules_ @chacon2014)], která zabraňují začlenění neověřeného kódu do stabilní větve `main`.

- Povinné schválení člověkem: Požadavek na explicitní autorizaci kódu lidským vývojářem dříve, než GitHub povolí sloučení do produkční větve.
  ],
  summary: none,
  visual: none,
  examples: (),
  attachments: (),
  citations: (),
  relations: ((type: "dependency", target: "required_checks"),),
)