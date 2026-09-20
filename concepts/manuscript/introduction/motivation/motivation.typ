#import "../../../../templates/common.typ": define-term, translation, unconfirmed, finalized, term
#import "../../../schema.typ": concept

#let terminology = define-term(
  id: "motivation-problem-definition",
  proper: translation(cs: "Motivace a vymezení problému", en: "Motivation and Problem Definition"),
  keyword: false,
)

#let item = concept(
  key: "motivation_problem_definition",
  term: terminology,
  definition: terms => [
#unconfirmed[
V moderním softwarovém inženýrství (#term(terms.software_engineering, marker: false, linked: false, emphasized: false)) dosáhla automatizace vysokého stupně zralosti. Sestavení zdrojových kódů, běh testovacích sad, statická analýza i nasazování do produkce probíhají běžně bez nutnosti lidského zásahu. Hlavním úzkým hrdlem celého vývojového procesu tak zůstává samotná tvorba a modifikace zdrojového kódu — časová prodleva mezi zadáním nového požadavku v podobě úkolu či hlášení chyby a vytvořením otestované, bezpečně začlenitelné změny.

Inspirací pro překonání tohoto omezení je průmyslový koncept temné továrny (_Dark Factory_) — plně automatizovaného výrobního provozu, který funguje samostatně bez nutnosti stálé přítomnosti lidské obsluhy. Cílem tohoto přístupu není vytlačení lidského inženýra, nýbrž posun jeho role: člověk definuje záměr, architekturu a funkční specifikaci, zatímco mechanické, rutinní a opakující se úkony přebírají autonomní systémy.

Nástup velkých jazykových modelů (LLM) otevřel cestu k automatizaci syntézy kódu, avšak stávající nástroje vykazují zásadní limity. Většina současných řešení (konverzační asistenti a doplňování kódu v editoru) řeší pouze izolovaný krok v podobě návrhu textového fragmentu. Chybí jim hlubší integrace do vývojového cyklu repozitáře: přímá práce se souborovým systémem, schopnost interpretovat výstupy překladače, iterativně odstraňovat syntaktické regrese a respektovat deterministická pravidla projektu.
]

#finalized[
Ústřední inženýrská otázka této práce proto nespočívá v tom, zda jazykový model dokáže napsat fragment kódu. Zkoumáme, jaká kontrolní a dozorčí architektura — značovaná jako #term(terms.harness, register: true, linked: true, marker: false) — musí model obklopovat, aby bylo možné jeho výstupům v produkčním repozitáři spolehlivě důvěřovat a dosáhnout vysoké míry autonomie se zachováním lidského dohledu.
]
  ],
  document_enabled: true,
)
