#import "../../templates/common.typ": define-term, translation, note, issue, alert, struct-alert, critique, added, draft, unconfirmed, accepted, finalized, removed, diff, scope-note, blue-note, term, kw
#import "../schema.typ": concept

#let terminology = define-term(
    id: "prompt-engineering",
    proper: translation(cs: "Promptové inženýrství", en: "Prompt Engineering"),
    explanation_cs: "Inženýrská metodika systematického návrhu, strukturování a optimalizace instrukcí a systémových promptů pro řízení chování a mantinelů jazykového modelu.",
    explanation_en: "An engineering discipline for systematically designing, structuring, and optimizing instructions and system prompts to guide and constrain language-model behavior.",
  )

#let item = concept(
  key: "prompt_engineering",
  term: terminology,
  heading: terms => [#finalized[Prompt Engineering (Promptové inženýrství)]],
  theory_enabled: true,
  theory_intro: none,
  theory_body: terms => [
#diff[Základní chování agenta vymezuje systémový prompt @anthropic-prompt, který definuje jeho identitu, sadu dostupných nástrojů a provozní mantinely.][#term(terms.prompt_engineering, render: "both", detail-language: "cs", detail-style: "inline") slouží k systematickému návrhu instrukcí, které řídí chování agenta. Základní instrukce jsou obvykle součástí systémového promptu @anthropic-prompt, který vymezuje roli agenta, dostupné nástroje a provozní mantinely.]
 Při formulaci těchto pravidel však vývojáři narážejí na specifickou vlastnost autoregresivních modelů — problematické zpracování zákazů a negativních instrukcí.

Příčiny a inženýrská řešení tohoto jevu:
- Úskalí negativních instrukcí: Zákazy formulované negací (např. „nemazat existující testy“) modely často porušují, protože matice pozornosti ($Q K^T$) asociativně aktivuje zakázaný pojem dříve, než autoregresní proces uplatní logický operátor negace.
- Afirmativní formulace: Pravidla je nutné formulovat pozitivně — namísto výčtu zákazů vymezit přesný postup a povolené mantinely chování.
- Deterministická ochrana v harnessu: Kde nestačí prompt, musí zasáhnout kód agent harnessu — například zpřístupněním testovacích souborů pouze pro čtení nebo zablokováním destruktivních operací na úrovni systémového volání.
  ],
  theory_summary: none,
  theory_after: none,
  theory_wrapper: unconfirmed,
  practical_enabled: false,
  practical_intro: none,
  practical_body: none,
  practical_summary: none,
  practical_after: none,
  practical_wrapper: none,
  related: (),
)
