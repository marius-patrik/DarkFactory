#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff, scope-note, blue-note

= Výsledky a diskuse

#blue-note[
  *Metodické vymezení výsledků a diskuse:*
  V souladu se zaměřením práce na principy agentního inženýrství a architekturu řídicího harnessu se tato kapitola soustředí na systémové a architektonické vlastnosti navrženého řešení: modularitu, determinismus, bezpečnostní izolaci a srovnání s existujícími přístupy (monolitické agentní smyčky vs. řízené DAG workflow).
]

== Sjednocení pracovních postupů a přenositelnost napříč doménami

#unconfirmed[
Architektonické principy centralizovaného harnessu:

- *Centralizace pracovních postupů*: Klientské repozitáře neudržují vlastní izolované skripty; exekuci delegují na centrální znovupoužitelné šablony a specifičnost projektu vymezují v deklarativním manifestu.
- *Údržbová složitost $O(1)$*: Bezpečnostní oprava či aktualizace v harnessu je provedena jednou a spotřebitelské projekty ji přebírají posunem připnuté verze ($O(1)$ oproti $O(N)$ manuálním úpravám v každém repozitáři zvlášť).
- *Statická kontrola jádra*: Jádro harnessu podléhá striktní typové kontrole a jednotkovému testování před každým vydáním.
- *Omezení jediného bodu selhání (SPOF)*: Projekty odkazují na neměnný kryptografický SHA hash commitu či sémantický tag, což vylučuje nechtěné regresní změny.
- *Konzistentní agentní prostředí*: Jednotný životní cyklus požadavků, správa kontextu, rotace modelů i vyhodnocení validačních bran napříč všemi projekty.
- *Oddělení prostředí od domény*:
  - *Doména programového kódu*: Kompilace, statická analýza, jednotkové testy a měření pokrytí.
  - *Doména textu a dokumentace*: Sazební kompilace, kontrola terminologie a generování auditovatelných PDF artefaktů.
- *Univerzální orchestrační automat*: Řídicí harness obsluhuje obě domény shodným stavovým automatem bez větvení integrační logiky.
]

== Provozní metriky a spolehlivost agentních běhů

#struct-alert[
  *Metriky čekají na novou evaluaci*: Původní ad-hoc měření byla vyřazena. Po dokončení a stabilizaci nové verze harnessu proběhne série strukturovaných měření nad reálnými vývojovými požadavky.
]

#note[Placeholder: Zde bude zařazena nová tabulka empirických metrik (počet zpracovaných požadavků, úspěšnost PR na první pokus, úspěšnost po automatické samoopravě, průměrná spotřeba tokenů na tah, časová latence a spolehlivost rotace modelů).]

== Poznatky a systémová úskalí z provozu

#unconfirmed[
Poznatky z nasazení autonomních agentů v CI:

- *Řízení souběžnosti a větvené zámky*: Paralelní integrační běhy vyžadují striktní zámky na úrovni větví, aby nedocházelo ke kolizím a uváznutí workflow.
- *Transparentnost hlášení selhání*: Zákaz tichého pohlcování výjimek; každá chyba nástroje nebo API musí být zaznamenána do kontextu a eskalována člověku. Tiché maskování chyb vede k masivním halucinacím modelu.
- *Deklarativní detekce prostředí*: Vyloučení implicitních předpokladů o repozitáři; veškeré kroky se deterministicky odvozují z přítomnosti souborů a deklarativního manifestu.
]

== Diskuse: Porovnání architektur

#unconfirmed[
Porovnání navrženého harnessu se současnými platformami (SWE-agent @yao2022, Devin, Copilot Workspace):

- *Deterministický DAG vs. nekonečná smyčka*:
  - *Volné smyčky (SWE-agent)*: Monolitický model v interaktivním terminálu sám rozhoduje o ukončení; při uvíznutí v atraktoru snadno vyčerpá rozpočet tokenů.
  - *Navržený harness*: Model je uzavřen do deterministického grafu (DAG) se striktně alokovaným rozpočtem tahů na každou fázi a izolací kontextu.
- *Granularita lidského dohledu*:
  - *Jednorázový přístup*: Přímé vygenerování celého PR; při špatném pochopení zadání vede ke stovkám řádků vadného kódu a únavě vývojáře z revizí (_review fatigue_).
  - *Dvoufázové schvalování*: Člověk autorizuje záměr a technický plán dříve, než agent začne zasahovat do repozitáře.
- *Bezpečnost a hermetičnost*:
  - *Lokální stroje*: Riziko poškození prostředí či úniku tajemství při spouštění netestovaného kódu.
  - *Efemérní CI kontejnery*: Běh v izolovaném sandboxu s minimálními oprávněními tokenů a auditovatelným protokolem všech operací.
]

== Systémová a metodická omezení

#unconfirmed[
Limity navržené architektury:

- *1. Hranice deterministické verifikovatelnosti*: Autonomie je spolehlivá pouze u objektivně testovatelných změn (kód, testy, typy). U subjektivních úloh (UX ergonomie, grafický design, stylistická formulace textu) zůstává role modelu asistenční a validaci provádí člověk.
- *2. Propustnost a dostupnost inferenčních API*: Rotační žebříček tlumí lokální výpadky, avšak globální kvóty a latence cloudových poskytovatelů tvoří pevný strop průchodnosti pipeline.
- *3. Absence vícevláknového řešení konfliktů*: Souběžná práce mnoha autonomních agentů a lidí nad týmiž soubory a řešení komplexních merge konfliktů představuje otevřenou výzvu pro navazující výzkum.
]
