#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Závěr

#diff[Hlavním cílem této práce bylo navrhnout, realizovat a v reálném provozu ověřit modulární systém pro autonomní vývoj softwaru, který převezme rutinní inženýrské úkony od přijetí požadavku po vytvoření strojově ověřené změny, aniž by slevil z principu lidského dohledu v rozhodujících fázích. Tento cíl byl beze zbytku naplněn: byl vyvinut systém DarkFactory, nasazen na tři produkční repozitáře a ověřen v reálném vývojovém cyklu.][Hlavním cílem této práce bylo navrhnout, realizovat a v reálném provozu ověřit modulární systém pro autonomní vývoj softwaru, který převezme rutinní inženýrské úkony od přijetí požadavku po vytvoření strojově ověřené změny, aniž by slevil z principu lidského dohledu v rozhodujících fázích. V rámci inženýrského cyklu se podařilo navrhnout, plně implementovat a empiricky ověřit systém DarkFactory, nasadit jej na tři produkční repozitáře a prověřit jeho robustnost nad šesti desítkami reálných vývojových požadavků.]

#draft[
Naplnění jednotlivých dílčích cílů lze ve vztahu ke stanovené metodice shrnout následovně:
+ *Současný stav a teoretická východiska (Kapitola 2)*: Práce systematicky zmapovala architekturu moderních dekodérových transformerů, mechanismus pozornosti, limity kontextového okna (včetně jevu _Context Rot_ a významu KV cache), techniky inženýrství promptů a formální strukturu autonomní ReAct smyčky alternující vnitřní rozvahu (_Thought_) a volání nástrojů (_Action_).
+ *Architektonický návrh (Kapitola 3)*: Byla navržena třívrstvá dekompozice propojující platformu GitHub, řídicí Python jádro a hermetické kontejnerové prostředí. Životní cyklus požadavku byl formalizován jako orientovaný stavový diagram s explicitními schvalovacími branami.
+ *Realizace a nasazení (Kapitola 3 a 4)*: Systém byl kompletně naprogramován a nasazen na tři repozitáře různého zaměření — vlastní repozitář systému DarkFactory, textový repozitář této odborné práce (`OdbornaPrace-paper`) a projekt `ChessWithQuests`.
+ *Vyhodnocení a provozní analýza (Kapitola 4)*: Architektonické sjednocení na volané pracovní postupy a centrální manifest eliminovalo roztříštěnou údržbu jednoúčelových skriptů napříč projekty. Práce ukazuje, že samotná redukce řádků konfigurace není směrodatnou metrikou úspěchu; podstatou je přesun složitosti do typovaného a testovaného metaharnessu s údržbovou složitostí $O(1)$. Nejcennějším zjištěním byla identifikace čtyř subtilních chyb v distribuovaném řízení (uváznutí souběžnosti, skládání názvů kontrol, tiché selhání API zápisů a pevný předpoklad o přítomnosti Pythonu), které byly v systému deterministicky vyřešeny.

V návaznosti na výsledky lze zodpovědět stanovené výzkumné otázky:
- *Zodpovězení VO1 (Míra automatizace a záruky)*: Rutinní inženýrské fáze lze úspěšně automatizovat, dosáhnout 86,9% úspěšnosti dokončení úloh a garantovat nulovou regresi v hlavní větvi, pokud je kódovací agent striktně svázán deterministickou CI validační branou a procesem squash-mergování.
- *Zodpovězení VO2 (Limity jazykových modelů)*: Hlavními limitujícími faktory v reálném repozitáři nejsou syntaktické schopnosti modelů, nýbrž kapacita kontextu při načítání rozsáhlých rozhraní, degradace pozornosti při dlouhých bězích a náchylnost k vyčerpání API limitů. Tyto limity vyžadují striktní modulaci kontextu a záchranné rotační žebříčky.
- *Zodpovězení VO3 (Škálovatelnost manifestu)*: Koncepce jediného deklarativního manifestu `darkfactory.json` a opakovaně použitelného CI workflow umožňuje připojit nový repozitář s minimální režií a udržovat sdílenou logiku s konstantní složitostí $O(1)$ bez rizika lavinových chyb díky verzování commitů.
]

#draft[
V průběhu vývoje a provozního testování vykrystalizovaly klíčové technické inovace, které tvoří hlavní přínos systému DarkFactory:
- *Dvoustupňový Human Gate (oddělení záměru a plánu)*: Na rozdíl od běžných asistentů, kteří bezprostředně po zadání generují kód, DarkFactory zavádí povinné schválení *záměru* (`interpreted`) a následně technického *plánu* (`planned`) v diskusním vlákně GitHub Issues. Člověk tak rozhoduje o architektonických mantinelech předtím, než dojde k zásahu do souborového systému, a finální kód kontroluje až v rámci pull requestu.
- *Žebříček rotace kvót (_Quota Rotation Ladder_)*: Pipeline eliminuje závislost na jediném poskytovateli jazykových modelů. Při vyčerpání kapacitních limitů (HTTP 429 či `RESOURCE_EXHAUSTED`) runner nesnižuje úroveň modelu na méně schopnou variantu v témže fondu, nýbrž rotuje autorizované účty a v případě potřeby přepíná mezi odlišnými CLI harnessy (Antigravity, Claude Code, Codex, Kimi).
- *Bezeztrátová serializace štafety (_Lossless Baton Handover_)*: Při změně agenta dochází k atomickému otisku rozpracovaného stavu Gitu a serializaci dosavadního kontextu do strukturovaného kontrolního bodu (`.checkpoint.json`). Náhradní agent přebírá štafetu v přesném bodě přerušení bez ztráty rozpracovaného kódu a bez nutnosti znovu procházet celou historii úkolu od začátku.
- *Jediný zdroj pravdy (`darkfactory.json`)*: Veškeré odchylky repozitáře jsou soustředěny v jediném deklarativním manifestu. Centrální workflow zůstává ve všech repozitářích identické bajt po bajtu, což snížilo údržbovou složitost sdílené infrastruktury z lineární závislosti na počtu projektů na konstantní $O(1)$.

Ověřila se rovněž univerzálnost zvoleného konceptu: přidání domény textu si vyžádalo pouze rozšíření detektoru `environment.py` a doplnění sazebních úloh, nikoli změnu řídicího jádra. Výsledný text této práce byl vysázen a publikován týmž systémem, který pojednává.
]

#added[
Z hlediska metodologické objektivity je nutné reflektovat absenci komparativní ablační studie (_ablation study_): práce prokázala vysokou end-to-end spolehlivost celého integrovaného systému, avšak exaktní měření mezního přínosu jednotlivých izolovaných prvků (např. vlivu dvoustupňového Human Gate na prodloužení celkové doby vyřešení požadavku oproti zisku v přesnosti) představuje otevřenou výzvu pro navazující akademický výzkum.

Další rozvoj systému DarkFactory se nabízí ve čtyřech perspektivních směrech:
1. *Formální verifikace*: Rozšíření aplikačních domén o interaktivní dokazovače vět a formální matematické prostředí (jazyk Lean 4).
2. *Autonomní samoléčení*: Automatické generování izolovaných regresních testů přímo ze stack trace chyb v CI a pověření agenta jejich okamžitou nápravou.
3. *Hybridní inferenční vrstva*: Zapojení lokálních open-weights modelů (např. spouštěných přes Ollama či vLLM) jako bezplatného prvního stupně pipeline pro rutinní syntaktickou kontrolu a formátování před delegováním komplexních kódovacích úloh na velká cloudová API.
4. *Kryptografická bezpečnost dodavatelského řetězce*: Zavedení automatického podepisování commitů vygenerovaných agentem pomocí klíčů GPG či Sigstore pro nezpochybnitelnou provenienci kódu a právní auditovatelnost v moderních softwarových organizacích.
]
