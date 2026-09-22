# School compliance — recovered Odborná práce contract

This file records the school-contract evidence currently recovered for DarkFactory-Paper.

## Sources

Primary recovered source:
- `marius-patrik/OdbornaPrace-mono/docs/Pruvodce-tvorbou-odborne-prace-2024.pdf`
- the archived mono README explicitly identifies this as the school **Průvodce tvorbou odborné práce** and describes it as the binding rule set used for the thesis template.

Secondary implementation evidence:
- `marius-patrik/template-OdbornaPrace@e58ed2c7b3d2432eddfbec238ce6561163d766a0`
- its README states that its layout follows chapter 4 of the school guide.
- its Typst template documents the corresponding formatting choices.

The current public school site did not expose a newer Odborná-práce guide through the searches performed during this audit. If a newer school-issued guide is found, it supersedes the recovered 2024 guide.

## Recovered contract

| Area | Recovered requirement / evidence | Status for DarkFactory-Paper |
| --- | --- | --- |
| Work type | Archived template renders **ODBORNÁ PRÁCE** | replace the current “Maturitní práce z IVT” assumption |
| Macrostructure | Archived canonical skeleton: **Úvod → Teoretická část → Praktická část → Výsledky a diskuse → Závěr** | restore explicit Theory/Practical/Results ownership |
| Paper | A4 | required |
| Margins | 2.5 cm; binding edge 3 cm | required |
| Body font | serif font, 12 pt | do not hard-code Times New Roman unless the guide itself is later shown to require it |
| Paragraphs | justified | required |
| Line spacing | 1.5 | required |
| Paragraph spacing | 8 pt after paragraph | recovered from guide-aligned template |
| First-line indent | none | recovered from guide-aligned template |
| Heading numbering | no trailing period | required |
| Heading sizes | bold 16 / 14 / 12 pt for levels 1 / 2 / 3 | recovered from guide-aligned template |
| Page numbers | centered footer, 11 pt, shown from Úvod | required |
| Page counter | front matter counts; archived template does **not** reset at Úvod | use unless exact guide text later proves otherwise |
| Front matter | title page, declaration, optional acknowledgement, Czech annotation/keywords, English annotation/keywords, contents | restore unless guide-text audit disproves a component |
| Figures/tables list | combined **Seznam obrázků a tabulek** when applicable | restore |
| Figure captions | 10 pt | recovered |
| Code/raw | 10 pt monospace is permitted by the guide-aligned template | do not force body serif font on code |
| Citations | ISO 690; numeric or author-date system supported, choice with supervisor | keep configurable |
| Bibliography heading | archived template uses **Seznam zdrojů** | use unless exact guide wording says otherwise |
| Appendices | numbered; **Seznam příloh** when present | required |
| Theory | summarizes current knowledge and concepts; sourced | required |
| Practical | own contribution; design, implementation, and verification methodology; reproducible detail | required |
| Results/discussion | factual results first, then interpretation/comparison/limitations | required |
| Conclusion | returns to objective; no new information | required |

## Items requiring exact-guide confirmation before final submission

The archived binary guide is retained in the historical repository, but the exact page text has not yet been machine-extracted in the coordinating environment. Therefore the following must receive a final direct-text check against the PDF itself before submission:

- exact declaration wording;
- exact annotation requirements;
- exact bibliography heading wording;
- whether English Annotation/Keywords are mandatory or merely template-supported;
- exact submission artifact requirements;
- any word/page-count minimum;
- any similarity/plagiarism threshold;
- any requirements not represented by the archived template.

Until that final check, do **not** import unrelated requirements from the IVT maturita-topic sheet as if they were Odborná-práce rules.

## Implementation rule

School compliance must be validated positively against this recovered contract and the final direct guide-text audit. Do not preserve an old formatting rule merely because it is already implemented.
