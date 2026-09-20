#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "token",
    proper: translation(cs: "Token", en: "Token"),
    explanation_cs: "Diskrétní jednotka zpracovávaná jazykovým modelem. Token odpovídá položce slovníku tokenizéru a je reprezentován číselným identifikátorem; nemusí odpovídat celému slovu.",
    explanation_en: "A discrete unit processed by a language model. A token corresponds to an entry in the tokenizer vocabulary and is represented by a numeric identifier; it need not correspond to a whole word.",
  )

#let item = concept(
  key: "token",
  term: terminology,
  heading: terms => [#finalized[Tokeny, tokenizace a Vektorová reprezentace \[Embedding\]]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#finalized[
Jazykový model nepracuje přímo se znaky ani slovy v lidském slova smyslu. Vstupní text je nejprve deterministickým algoritmem převeden na číselné reprezentace, se kterými následně počítají maticové vrstvy neuronové sítě.

Tento proces zahrnuje následující pojmy:
]
- #finalized[Tokeny a tokenizér (#term(terms.tokenizer, language: "en", marker: false, linked: false, emphasized: false)): Token představuje základní diskrétní jednotku (celé slovo, slabiku či fragment znaků). Převod mezi textem a posloupností číselných tokenů zajišťuje tokenizér (nejčastěji na bázi algoritmu Byte Pair Encoding, BPE).]
- #finalized[#term(terms.embedding, render: "both", detail-language: "cs", detail-style: "inline") (např. vektorová analogie $"král" - "muž" + "žena" approx "královna"$).]
- #finalized[Jazyková asymetrie tokenizace: Vzhledem k trénovacím datům optimalizovaným primárně pro angličtinu spotřebovávají flektivní jazyky s bohatou diakritikou (včetně češtiny) 2× až 3× více tokenů pro vyjádření téhož významu.]

#finalized[
Z inženýrského hlediska je proto žádoucí vést systémové prompty, technické plány i komunikaci mezi nástroji v angličtině, aby se šetřila kapacita kontextu a snížila latence inference.
]
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: none,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  relations: (),
)
