#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Závěr

#struct-alert[
  *Závěr a vyhodnocení cílů v revizi*: Vzhledem k probíhající zásadní přestavbě systému DarkFactory jsou konkrétní empirické statistiky předchozí verze vyřazeny a nahrazeny strukturálními zástupnými bloky. Finální vyhodnocení a zodpovězení výzkumných otázek bude aktualizováno po dokončení evaluace nové verze.
]

#draft[
Hlavním cílem této práce bylo navrhnout, realizovat a v reálném provozu ověřit modulární systém pro autonomní vývoj softwaru, který převezme rutinní inženýrské úkony od přijetí požadavku po vytvoření strojově ověřené změny, aniž by slevil z principu lidského dohledu v rozhodujících fázích. V rámci inženýrského cyklu byl navržen systém DarkFactory a nasazen na testovací repozitáře zahrnující jak programovací kód, tak akademickou sazbu.
]

#draft[
Naplnění jednotlivých dílčích cílů lze ve vztahu ke stanovené metodice shrnout následovně:
+ *Současný stav a teoretická východiska (Kapitola 2)*: Práce systematicky zmapovala architekturu moderních dekodérových transformerů, mechanismus pozornosti, limity kontextového okna (včetně jevu _Context Rot_ a významu KV cache), techniky inženýrství promptů a formální strukturu autonomní ReAct smyčky alternující vnitřní rozvahu (_Thought_) a volání nástrojů (_Action_).
+ *Architektonický návrh (Kapitola 3)*: Byl navržen modulární model propojující platformu GitHub, řídicí orchestrační vrstvu a izolované běhové prostředí pro modely. Životní cyklus požadavku byl formalizován do stavového diagramu s explicitními schvalovacími branami.
+ *Realizace a nasazení (Kapitola 3 a 4)*: Systém byl nasazen a ověřen na repozitářích různého zaměření — vlastní vývojové prostředí systému, textový repozitář této odborné práce (`OdbornaPrace-paper`) a aplikační projekt `ChessWithQuests`.
+ *Vyhodnocení a provozní analýza (Kapitola 4)*: Architektonické sjednocení na sdílené pracovní postupy a centrální manifest eliminovalo roztříštěnou údržbu jednoúčelových skriptů napříč projekty s údržbovou složitostí $O(1)$. Provozní zkušenosti potvrdily, že klíčová úskalí neleží v generování kódu modely, nýbrž v distribuované orchestraci, řízení souběžnosti a dynamické detekci prostředí.

V návaznosti na výsledky lze zodpovědět stanovené výzkumné otázky:
- *Zodpovězení VO1 (Míra automatizace a role člověka)*: Vývojový proces od zadání v GitHub Issues po vytvoření ověřeného pull requestu lze úspěšně zautomatizovat. Člověk v průběhu řešení nepsal ani neupravoval zdrojový kód, nýbrž působil výhradně jako architektonický dozor v rámci vícefázového schvalování a finální revize pull requestu.
  #note[Placeholder: Zde bude doplněna přesná kvantitativní úspěšnost po evaluaci nové verze DarkFactory.]
- *Zodpovězení VO2 (Doménová přenositelnost)*: Systém prokázal přenositelnost centrálního workflow mezi odlišnými doménami. Repozitář této odborné práce (`OdbornaPrace-paper`) využívá tutéž agentní pipeline jako softwarové projekty; veškerá doménová specifika (nástroj Typst, parametry sazby) jsou zapouzdřena v deklarativní konfiguraci bez nutnosti větvit sdílené šablony.
- *Zodpovězení VO3 (Provozní odolnost a obnova)*: Víceúrovňová rotace kvót a kontrolní body zabránily haváriím integračních běhů při vyčerpání limitů API. Integrovaná smyčka samooprav navíc dokázala autonomně vyřešit syntaktické a integrační regrese na základě zpětné vazby z testů.
  #note[Placeholder: Zde budou doplněny konkrétní statistiky obnovy a spolehlivosti nové verze systému.]
]

#draft[
Klíčové architektonické principy a přínosy systému DarkFactory:
- *Vícefázový Human Gate*: Oddělení schvalování záměru a technického plánu v GitHub Issues před samotným zásahem do kódu zaručuje lidskou kontrolu nad architektonickými mantinely a šetří čas vývojáře.
- *Orchestrace nezávislá na poskytovateli*: Pipeline eliminuje závislost na jediném poskytovateli jazykových modelů mechanismem rotace účtů a modelových fondů při vyčerpání limitů.
- *Bezeztrátové předávání štafety*: Uložení rozpracovaného stavu a kontextu do kontrolního bodu umožňuje plynulé navázání náhradního modelu bez ztráty dosavadní práce.
- *Jediný zdroj pravdy*: Veškeré odchylky repozitáře jsou deklarovány v konfiguračním manifestu, což udržuje sdílenou infrastrukturu snadno spravovatelnou.

#note[Placeholder: Zde budou specifikovány nové technické inovace přestavěného systému DarkFactory.]
]

#draft[
Další rozvoj systému DarkFactory se nabízí ve čtyřech perspektivních směrech:
1. *Formální verifikace*: Rozšíření aplikačních domén o interaktivní dokazovače vět a formální matematické prostředí (jazyk Lean 4).
2. *Autonomní samoléčení*: Automatické generování izolovaných regresních testů přímo ze stack trace chyb v CI a pověření agenta jejich okamžitou nápravou.
3. *Hybridní inferenční vrstva*: Zapojení lokálních open-weights modelů jako bezplatného prvního stupně pipeline pro rutinní syntaktickou kontrolu před delegováním komplexních úloh na velká cloudová API.
4. *Kryptografická bezpečnost dodavatelského řetězce*: Zavedení automatického podepisování commitů vygenerovaných agentem pomocí klíčů GPG či Sigstore pro nezpochybnitelnou provenienci kódu.
]
