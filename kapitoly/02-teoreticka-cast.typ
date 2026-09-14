#import "../lib/odborna-prace.typ": note, issue, alert, struct-alert, critique, added, draft, unconfirmed, confirmed, removed, diff

= Teoretická část

#confirmed[
Tato kapitola vymezuje pojmy, o které se opírá praktická část: řízení verzí,
kontinuální integraci, orchestraci jazykových modelů a princip zapojení člověka
do smyčky (_Human-in-the-loop_). Cílem není vyčerpávající přehled, nýbrž zavedení
pojmů v podobě, v jaké s nimi pracuje navržený systém.
]

== Řízení verzí

#confirmed[
Systém pro řízení verzí uchovává historii změn zdrojového kódu. Distribuovaný
model, jehož nejrozšířenějším zástupcem je Git, se od centralizovaného liší tím,
že každý vývojář má úplnou kopii historie @chacon2014. Změny lze proto vytvářet
a zkoumat i bez spojení se serverem a slučovat je až ve chvíli, kdy jsou hotové.
]

=== Větve a jejich role

#confirmed[V moderních distribuovaných systémech správy verzí (zejména v systému Git @chacon2014) je repozitář formálně modelován jako orientovaný acyklický graf (_Directed Acyclic Graph_, DAG), jehož uzly tvoří neměnné objekty revizí (_commits_) provázané kryptografickými hashy (SHA-1 či SHA-256) na své rodičovské stavy. Větev v tomto modelu nepředstavuje fyzickou kopii souborů, nýbrž odlehčený, pohyblivý ukazatel (_ref_) na konkrétní uzel grafu.

Tato grafová architektura má klíčový význam pro bezpečné zapojení autonomních agentů do vývojového procesu:
- *Izolace stavu*: Agent operuje ve vyhrazené větvi (např. `feature/...` nebo `agent/...`), která odbočuje z hlavní vývojové linie (`main`). Veškeré pokusné mutace souborového systému, mezistavy a ladicí kroky zůstávají striktně izolované, aniž by ohrozily stabilitu produkčního kódu nebo práci ostatních členů týmu.
- *Deterministický audit*: Každý krok agenta lze reprezentovat jako atomický commit s přesným časovým otiskem, autorskými metadaty a odkazem na kontextové zadání. Vzniká tak neměnná a zpětně ověřitelná historie změn.
- *Strategie slučování*: Při integraci hotové větve do hlavní linie se uplatňují různé topologické strategie: přímý posun ukazatele (_fast-forward_), vytvoření explicitního slučovacího uzlu (_merge commit_), nebo sloučení celé sekvence dílčích mezikroků agenta do jediného čistého uzlu (_squash and merge_). Právě squashování je v autonomních pipeline preferováno, neboť eliminuje šum v podobě neúspěšných pokusů modelu a v hlavní větvi zanechává pouze finální, ověřený přírůstek.]

=== Model pull requestu

#confirmed[Sloučení větve do hlavní vývojové linie se v moderním kolaborativním softwarovém inženýrství odehrává prostřednictvím modelu *pull requestu* (PR, na platformě GitLab též _Merge Request_). Jde o formalizovaný procesní uzel, v němž autor větve předkládá navržený diff kódu k revizi dříve, než dojde k jeho trvalému začlenění do chráněné hlavní větve.

V kontextu autonomního vývoje plní pull request dvě nezastupitelné funkce:
1. *Strojová validační brána*: Na vytvoření nebo aktualizaci PR reaguje integrační server (CI), který v izolovaném kontejneru spustí sadu automatizovaných testů, typových kontrol a bezpečnostních linterů. Tím je objektivně ověřeno, že syntetický kód generovaný modelem splňuje stanovené standardy a nezpůsobuje regresi stávající funkcionality.
2. *Lidská schvalovací brána (Human Gate)*: Pull request poskytuje přehledné rozhraní zobrazující řádkový diff změn, výsledky automatických testů a strukturovaný popis úprav. Člověk v roli recenzenta (_code reviewera_) tak může provést finální sémantickou kontrolu a rozhodnout o schválení či zamítnutí změny. Pull request tím představuje ideální architektonický styčný bod pro princip člověka ve smyčce (_Human-in-the-loop_).]


== Kontinuální integrace

#confirmed[
Kontinuální integrace (angl. _continuous integration_) je praxe, při níž se
každá změna automaticky sestaví a otestuje @humble2010. Namísto dlouhých období,
kdy se změny hromadí a slučují až na konci, se ověřuje průběžně a v malých
dávkách, takže chyba je odhalena blízko svému vzniku.
]

=== Požadované kontroly

#confirmed[
Ke kontinuální integraci patří pojem _požadovaných kontrol_ (angl. required
checks): množina úloh, které musí skončit úspěšně, jinak nelze změnu sloučit.
Tím se z kvality stává vlastnost vynucovaná strojem, nikoli pouze dohodou mezi
vývojáři.

Návrh požadovaných kontrol má jedno nezřejmé úskalí. Úloha, která se za jistých
okolností „přeskočí“, nehlásí žádný výsledek; je-li přitom uvedena mezi
požadovanými, zablokuje slučování napořád. Kontrola proto musí vždy skončit
nějakým závěrem — i kdyby jím bylo konstatování, že v daném repozitáři není
co dělat.
]

=== Sestavení a artefakty

#confirmed[
Výsledkem sestavení bývá _artefakt_: spustitelný soubor, knihovna, nebo — jak
ukazuje praktická část — vysázený dokument. Automatizace vydávání verzí spojuje
artefakt se značkou v historii, takže ke každé vydané verzi existuje doložitelný
výstup.
]

== Jazykové modely a jejich orchestrace

=== Transformer a LLM

#draft[
Transformer je architektura hlubokých neuronových sítí představená společností Google v roce 2017 v rámci výzkumu strojového překladu. Na rozdíl od starších architektur (např. rekurentních sítí RNN), které sekvence zpracovávaly krok po kroku a trpěly ztrátou dlouhodobého kontextu, využívá transformer mechanismus zvaný _attention_ (pozornost). Ten modelu umožňuje paralelně vyhodnocovat sémantické souvislosti mezi všemi tokeny v sekvenci bez ohledu na jejich vzájemnou vzdálenost.

LLM neboli _Large Language Model_ (velký jazykový model) je rozsáhlá neuronová síť postavená na architektuře transformeru a předtrénovaná na textových datech o objemu stovek miliard až bilionů tokenů. Díky mechanismu pozornosti model dokáže zachytit hluboké syntaktické i sémantické struktury přirozeného jazyka, což se navenek projevuje schopností generalizace, abstrakce a generování korektního zdrojového kódu.
]

#draft[
Tento architektonický přelom popsala publikace _Attention Is All You Need_ @vaswani2017. Původní model byl koncipován jako *Encoder-Decoder* (kodér-dekodér) pro strojový překlad: obousměrný kodér nejprve zkomprimoval celou vstupní větu a dekodér za pomoci křížové pozornosti (_cross-attention_) generoval překlad v cílovém jazyce.

Ve vývoji softwaru a moderních agentních systémech se však naprostým standardem stala architektura *Decoder-only* (např. GPT, Claude, LLaMA či DeepSeek). Tyto modely pracují čistě autoregresivně — predikují vždy následující nejpravděpodobnější token na základě celého předcházejícího kontextu. Instrukce, pravidla, kontext repozitáře i rozepsaný kód tvoří jedinou společnou sekvenci, což umožňuje plynulé doplňování kódu i přímé generování volání nástrojů. Architektura pouze s dekodérem navíc vykazuje vynikající vlastnosti při škálování parametrů a efektivní správě KV cache v dlouhých kontextech.
]

=== Tokeny, tokenizér a embedding

#draft[
Text, se kterým člověk pracuje ve formě slov a vět, není pro neuronovou síť přímo srozumitelný. Model interně operuje pouze s čísly a maticovými operacemi. Aby bylo možné přirozený jazyk zpracovat, musí projít procesem tokenizace a následného převodu na vektorové reprezentace.

Základní jednotkou, kterou model vnímá, je *token*. Token nemusí odpovídat celému slovu ani jednotlivému znaku — moderní jazykové modely využívají tzv. sub-word tokenizaci (nejčastěji algoritmy jako Byte-Pair Encoding či WordPiece). Běžná slova jsou často reprezentována jediným tokenem, zatímco méně častá slova, odborné výrazy nebo slova v jazycích s bohatou morfologií a diakritikou (jako je čeština) jsou rozložena do více dílčích tokenů. Průměrně jeden token v angličtině odpovídá přibližně 3 až 4 znakům. V češtině je spotřeba tokenů na slovo znatelně vyšší, což má přímý dopad na efektivní kapacitu kontextového okna i výpočetní náklady inference.

Převod mezi surovým textovým řetězcem a posloupností celočíselných identifikátorů (token IDs) zajišťuje *tokenizér*. Jedná se o deterministický program, který vychází z pevně daného slovníku (tzv. vocabulary, obvykle čítajícího 32 000 až 128 000 unikátních tokenů). Tokenizér provádí obousměrný proces: při vstupu rozseká text na tokeny a přiřadí jim číselné indexy, při výstupu naopak generované indexy skládá zpět do souvislého textu (tzv. detokenizace).

Samotné číslo tokenu však nenese žádnou informaci o jeho významu. Proto následuje vrstva zvaná *embedding* (vektorové vnoření). Každý token je převeden na spojitý vícerozměrný vektor (typicky o dimenzi 4 096 či 8 192 čísel). V tomto geometrickém prostoru jsou slova s podobným významem či kontextem umístěna blízko u sebe (např. měřeno kosinovou podobností).

Jednotlivé geometrické směry a posuny v prostoru navíc odpovídají konkrétním sémantickým relacím a abstraktním vlastnostem. Zjednodušeným a klasickým příkladem fungování tohoto prostoru je vektorová aritmetika pojmů: pokud vezmeme vektor reprezentující pojem „žena“ a přičteme k němu vektor reprezentující posun k „panovnickému stavu / královskému statusu“, výsledný bod v prostoru leží nejblíže reprezentaci slova „královna“ ($arrow(v)("žena") + arrow(v)("královský status") approx arrow(v)("královna")$). Model tak nepracuje se slovy jako s izolovanými symboly, ale manipuluje se vztahy mezi nimi jako s algebraickými posuny ve vícerozměrném prostoru — což se v programování projevuje schopností zachytit vztahy mezi deklarací proměnné, jejím použitím a typovým kontextem.

Aby architektura transformeru zohlednila také pořadí tokenů v sekvenci, přičítá se k sémantickému embeddingu poziční kódování (positional encoding, dnes standardně rotační embedding RoPE). Teprve takto vzniklé vektory vstupují do mechanismu pozornosti k dalšímu výpočtu.
]

#figure(
  image("../img/vector-embedding-queen.svg", width: 100%),
  caption: [Geometrická reprezentace sémantických vztahů v embeddingovém prostoru: A) Klasická vektorová aritmetika pojmů ($arrow(v)("král") - arrow(v)("muž") + arrow(v)("žena") approx arrow(v)("královna")$), B) Izomorfní algebraické relace v programování (funkce $arrow$ metoda, proměnná $arrow$ atribut).],
) <fig-embedding-queen>

#draft[
Grafické znázornění na @fig-embedding-queen ilustruje, jak vícerozměrné vektorové vnoření zachycuje abstraktní sémantické relace. Na levém panelu (A) je patrné, že vektorový posun reprezentující přechod k panovnickému stavu ($arrow(v)("panovník")$) má téměř identický směr a velikost jak mezi „mužem“ a „králem“, tak mezi „ženou“ a „královnou“. Pravý panel (B) ukazuje analogický princip v programovacím kódu: model vnímá vztah mezi volně stojící funkcí a metodou zapouzdřenou ve třídě jako paralelní posun ve vektorovém prostoru k relaci mezi globální proměnnou a atributem objektu. Díky této prostorové struktuře dokáže LLM provádět konzistentní refaktoring a typovou inferenci.
]

#added[
Praktický dopad sub-word tokenizace na efektivitu a kapacitní limity agenta demonstruje @tab-token-comparison. Identické větné sdělení vyžaduje v češtině 33 tokenů oproti pouhým 12 tokenům v angličtině (měřeno tokenizérem `cl100k_base`). Český text tak spotřebovává 2,75× více prostoru v kontextovém okně a úměrně tomu zvyšuje finanční náklady i latenci inference. V autonomních vývojových pipeline je proto optimální vést vnitřní systémové prompty, technické plány a strukturované logy v angličtině, zatímco lidská interakce v zadání může probíhat v mateřském jazyce vývojáře.

#figure(
  table(
    columns: (auto, 1fr, auto, auto),
    align: (left, left, center, center),
    table.header([*Jazyk*], [*Znění věty*], [*Znaky*], [*Tokeny*]),
    [Angličtina], [An autonomous software development system analyzes requirements and proposes code changes.], [90], [12],
    [Čeština], [Autonomní systém pro vývoj softwaru analyzuje požadavky a navrhuje změny kódu.], [79], [33],
  ),
  caption: [Empirické porovnání tokenové náročnosti ekvivalentního větného významu v angličtině a češtině (tokenizér `cl100k_base`).],
) <tab-token-comparison>
]

=== Mechanismus pozornosti a jeho typy

#added[
Zatímco tokenizér a embedding transformují diskrétní text do spojitého vektorového prostoru, funkčním jádrem architektury transformeru je mechanismus pozornosti (_attention mechanism_). Pozornost umožňuje modelu dynamicky vyhodnocovat sémantické relace mezi jednotlivými tokeny v sekvenci bez ohledu na jejich vzájemnou vzdálenost, a překonat tak fundamentální limit starších rekurentních architektur (RNN a LSTM), které trpěly postupnou ztrátou kontextu.

==== Matematická podstata: Scaled Dot-Product Attention

Základní stavební jednotkou představenou v práci @vaswani2017 je skalovaný skalární součin (_Scaled Dot-Product Attention_). Pro každý vstupní vektor tokenu se lineární projekcí generuje trojice vektorů:
- *Dotaz ($Q$ -- Query)*: Vektor reprezentující informaci, kterou aktuální token v kontextu vyhledává.
- *Klíč ($K$ -- Key)*: Vektor nesoucí charakteristiku a profil tokenu, podle něhož je identifikován.
- *Hodnota ($V$ -- Value)*: Vektor obsahující vlastní sémantický obsah, který je v případě shody předán do dalších vrstev.

Míra relevance mezi libovolnou dvojicí tokenů je dána skalárním součinem $Q K^T$. Výsledná matice afinity je škálována odmocninou dimenze klíče $sqrt(d_k)$, což zabraňuje prudkému růstu číselných hodnot a následné saturaci funkce softmax (která by vedla k vymizení gradientů při trénování). Výstupní kontextová reprezentace je definována jako vážený součet hodnot $V$:

$ "Attention"(Q, K, V) = "softmax"((Q K^T) / sqrt(d_k)) V $

Z matematické formulace vyplývá klíčová vlastnost: výpočet součinu $Q K^T$ pro sekvenci délky $N$ vyžaduje sestavení matice o rozměrech $N times N$. Výpočetní složitost i paměťové nároky proto rostou *kvadraticky* $O(N^2)$ vzhledem k délce kontextu, což při zpracování rozsáhlých repozitářů a dlouhých agentních historií představuje primární výkonnostní limit.

==== Směrové a funkční typy pozornosti

Podle původu vektorů $Q$, $K$ a $V$ a směru toku informací se rozlišují tři základní funkční typy:
+ *Vlastní pozornost (Self-Attention)*: Vektory $Q$, $K$ i $V$ jsou odvozeny ze stejné vstupní sekvence. Každý token v kontextu tak přímo interaguje se všemi ostatními tokeny kódové báze (např. provázání volání funkce s její definicí v jiném modulu).
+ *Kauzální (maskovaná) pozornost (Causal / Masked Attention)*: Klíčový princip autoregresivních modelů (_Decoder-only_). Aby model při predikci kódu nemohl „nahlížet do budoucna“, je na matici skalárních součinů před aplikací softmaxu uvalena kauzální maska ($M_(i,j) = -infinity$ pro $j > i$). Tím je matematicky zaručeno, že token na pozici $i$ smí reflektovat výhradně předcházející tokeny na pozicích $j <= i$.
+ *Křížová pozornost (Cross-Attention)*: Dotazy $Q$ pocházejí z generujícího dekodéru, zatímco klíče $K$ a hodnoty $V$ jsou přebírány z externí reprezentace — např. z vizuálního enkodéru zpracovávajícího screenshoty či diagramy v multimodálních architekturách.

==== Architektury organizace hlav (Head Architectures)

V praxi transformer nepočítá pozornost pouze jednou, nýbrž v paralelních projekčních podprostorech zvaných *hlavy* (_Multi-Head Attention_ -- MHA). Během inference se však ukázalo, že ukládání mezistavů klíčů a hodnot do mezipaměti grafické karty (_KV Cache_) pro všechny hlavy a vrstvy představuje kritické paměťové úzké hrdlo. To vedlo k vývoji několika architektonických variant (srovnání uvádí @tab-attention-types):

+ *Multi-Head Attention (MHA)*: Původní architektura (@vaswani2017). Každá z $h$ hlav má vlastní nezávislé projekční váhy pro $Q$, $K$ i $V$. Poskytuje maximální reprezentační kapacitu, avšak velikost KV cache v paměti GPU roste strmě s počtem hlav a délkou kontextu.
+ *Multi-Query Attention (MQA)*: Architektura navržená Shazeerem (2019). Všechny dotazové hlavy sdílejí jedinou společnou hlavu klíčů a hodnot ($K$ a $V$). Velikost KV cache v paměti klesá $h$-násobně, což radikálně zrychluje generování tokenů a snižuje paměťové nároky, avšak za cenu mírné degradace kvality u úloh vyžadujících komplexní logické uvažování.
+ *Grouped-Query Attention (GQA)*: Zlatý standard současných produkčních modelů (např. LLaMA 3 či Mistral; @ainslie2023). Dotazové hlavy jsou rozděleny do $g$ skupin, přičemž každá skupina sdílí vlastní pár hlav $K$ a $V$. Představuje optimální kompromis: dosahuje kvality srovnatelné s MHA při paměťové úspoře blízké MQA (obvykle 12,5–25 % původní velikosti KV cache).
+ *Multi-head Latent Attention (MLA)*: Moderní architektura vyvinutá pro modely DeepSeek-V2/V3. Místo prostého sdílení hlav komprimuje vektory klíčů a hodnot do nízkorozměrného latentního prostoru pomocí společné maticové komprese (_low-rank joint compression_). Během inference se do KV cache ukládá pouze kompaktní latentní vektor, což dramaticky redukuje paměťovou stopu a umožňuje obsluhu masivních kontextových oken.

#figure(
  table(
    columns: (auto, auto, auto, auto, 1fr),
    align: (left, center, center, center, left),
    table.header([*Typ pozornosti*], [*Hlavy $Q$*], [*Hlavy $K, V$*], [*Velikost KV Cache*], [*Charakteristika a využití*]),
    [MHA], [$h$], [$h$], [100 % (báze)], [Původní Transformer, GPT-3. Maximální exprese, vysoké nároky na VRAM.],
    [MQA], [$h$], [1], [$1 / h$ (~3–6 %)], [Falcon, PaLM. Extrémní úspora paměti, možný mírný pokles přesnosti.],
    [GQA], [$h$], [$g$ ($1 < g < h$)], [$g / h$ (~12–25 %)], [LLaMA 3, Mistral. Špičkový standard kombinující přesnost a propustnost.],
    [MLA], [$h$], [Latentní komprese], [~5–10 %], [DeepSeek-V2, DeepSeek-V3. Nízkorozměrná latentní projekce s vysokou věrností.],
  ),
  caption: [Srovnání architektur organizace hlav mechanismu pozornosti a jejich dopad na paměťovou náročnost KV cache.],
) <tab-attention-types>

==== Hardwarové a algoritmické optimalizace pro škálování kontextu

Kvadratická závislost $O(N^2)$ si vyžádala vývoj algoritmických a nízkoúrovňových hardwarových akcelerací:
- *Sliding Window a Sparse Attention (SWA)*: Pozornost je omezena na lokální okno $W$ nejbližších sousedních tokenů (např. $W = 4096$ v modelu Mistral). Ačkoli v jedné vrstvě model nevidí celou sekvenci, skládáním vrstev nad sebou efektivní kontextové pole roste, zatímco výpočetní složitost klesá na lineární $O(N times W)$.
- *FlashAttention*: Převratná optimalizace navržená Dao et al. (@dao2022, následovaná architekturami FlashAttention-2 a FlashAttention-3). FlashAttention neprovádí žádnou ztrátovou aproximaci — matematický výsledek je exaktní. Podstata spočívá v hardwarovém uvědomění (_IO-awareness_): namísto ukládání ohromné mezilehlé matice pozornosti $N times N$ do pomalé globální paměti grafické karty (HBM) rozděluje výpočet na bloky (tzv. _tiling_) a provádí normalizaci online algoritmem softmaxu přímo v rychlé čipové mezipaměti SRAM procesoru GPU. Tím dramaticky redukuje paměťové přenosy a umožňuje praktické škálování kontextového okna na stovky tisíc až miliony tokenů.
]

=== Multimodální modely

#draft[
Architekturu transformeru lze aplikovat i mimo oblast zpracování přirozeného jazyka. V moderní praxi lze tokenizovat v podstatě jakýkoli diskrétní či spojitý signál — ať už jde o rastrový obraz, sekvenci snímků videa, zvukové vlny nebo trajektorie pohybů v robotice. Zásadní posun nastává ve chvíli, kdy model disponuje oddělenými projekčními vrstvami pro různé typy vstupů (např. kombinací textového tokenizéru a vizuálního enkodéru, jako je ViT — _Vision Transformer_) a mechanismus pozornosti (_cross-attention_) operuje společně nad tokeny textu i obrazu. Model tak dokáže propojovat vizuální a textové sémantické reprezentace ve sdíleném vektorovém prostoru.

V kontextu automatizovaného vývoje softwaru a autonomních pipeline (jako je systém DarkFactory) se multimodální schopnosti uplatňují ve třech klíčových oblastech:
+ *Vizuální regresní testování*: Model dokáže porovnat referenční snímek uživatelského rozhraní se stavem vygenerovaným v CI (např. při testování webových komponent bezhlavým prohlížečem) a identifikovat nežádoucí posuny rozvržení či stylové chyby.
+ *Diagnostika chyb z artefaktů CI*: Při selhání integračních testů může pipeline předat agentovi screenshot chybové obrazovky nebo interaktivního prvku, z něhož agent rozpozná příčinu selhání snáze než z pouhého textového stack trace.
+ *Interpretace grafických zadání*: Vývojář může v zadání úkolu (GitHub Issue) specifikovat požadovanou změnu formou náčrtku, wireframu či diagramu komponent. Multimodální agent takový grafický podklad přímo zanalyzuje a převede jej na strukturovaný kód.
]

#issue[Rozpor mezi teoretickým popisem a stavem implementace: Podkapitola 2.3.3 uvádí využití multimodálních modelů v systému DarkFactory (vizuální regresní testování, diagnostika screenshotů z CI, wireframy) jako hotovou součást pipeline. V praktické části ani ve výsledcích však podpora pro obrazové vstupy integrována není (pipeline pracuje čistě s textovými diffy a logy). Je nutné text přeformulovat a uvést, že jde o teoretický potenciál či plánované rozšíření architektury.]

=== Context

==== Turn

#confirmed[Každému diskrétnímu kroku ve výměně informací mezi okolním prostředím a jazykovým modelem se v agentních architekturách říká tah (_turn_). Na rozdíl od jednoduchého konverzačního rozhraní, kde dochází pouze ke střídání uživatele a asistenta, agentní smyčka (typicky implementující vzor ReAct @yao2022) rozlišuje tři základní typy tahů:
1. *Tah uživatele či prostředí (_User / Environment Turn_)*: Vnáší do kontextu nové zadání, externí událost (např. spuštění GitHub webhooku) nebo doplňující instrukce.
2. *Tah modelu (_Model / Assistant Turn_)*: Reprezentuje jedno spuštění inference neuronové sítě. Model na základě dosavadní historie emituje buď finální textovou odpověď, nebo strukturovaný požadavek na vyvolání nástroje (_tool call_).
3. *Tah vykonání nástroje (_Tool Execution Turn_)*: Běhové prostředí (harness) provede požadovanou operaci — např. spuštění skriptu v terminálu či čtení souboru — a její výsledek vloží do kontextu jako syntetický tah určený pro navazující uvažování modelu.

Striktní oddělení těchto fází a jejich deterministická serializace do historie kontextu mají zásadní dopad na výpočetní efektivitu: umožňují inferenčnímu serveru plně využívat cachování klíčů a hodnot (_KV cache_), neboť neměnná historie předchozích tahů nemusí být při každém kroku znovu přepočítávána.]

==== Context Window

#confirmed[
Model je schopen přijmout pouze omezený objem vstupu; tomuto limitu se říká kontextové okno (_Context Window_) a vyjadřuje se v počtu tokenů. Na rozdíl od slovníku (_vocabulary_), který vymezuje pouze repertoár známých tokenů, je maximální délka kontextového okna určena architekturou pozičního kódování (např. škálováním frekvenčních bází v RoPE) a hardwarovou náročností mechanismu pozornosti — kvadratickou složitostí $O(N^2)$ a velikostí alokované KV cache v operační či grafické paměti.
]

==== Compaction

#confirmed[Představuje proces sumarizace a zkrácení historie, který řídicí harness iniciuje ve chvíli, kdy zaplnění kontextového okna dosáhne stanoveného prahu. Zpravidla jde o vyvolání modelu se specifickou systémovou instrukcí pro bezeztrátovou syntézu dosavadního průběhu sezení a kompletním protokolem dosavadní komunikace. Výsledný zkrácený kontext následně v kontextovém okně nahradí původní rozsáhlou historii kroků.]

==== Context Rot a evaluace vybavování (Needle In A Haystack)

#critique[Teoretická naivita rekurzivní komprese: Popsaný mechanismus komprese (Compaction) se v textu tváří jako elegantní a bezproblémové řešení, v reálu jde však o destruktivní ztrátovou kompresi. Model při rekurzivním zkracování historie trpí silným konfirmačním zkreslením — sumarizuje to, co sám považuje za podstatné, čímž nevratně maže přesná čísla řádků, jemné sémantické hrany zadání, negativní mantinely („tohle nikdy neměň“) a detaily chybových hlášení. Práce se vůbec nezabývá fundamentálním fenoménem sémantického posunu (_semantic drift_) po několika kolech komprese, ani moderními bezeztrátovými alternativami (hierarchická RAG paměť, persistentní graf stavu projektu či selective KV cache eviction).]

#confirmed[Označuje empiricky zdokumentovanou degradaci schopnosti modelu věnovat rovnoměrnou pozornost všem částem historie (tzv. jev _Lost in the Middle_ @liu2024). Čím plnější je kontextové okno, tím méně jsou modely schopny spolehlivě vybavovat jemné detaily z úvodu sezení a dodržovat negativní omezující podmínky zadání.]

#added[
Ke standardizovanému testování schopnosti modelu přesně vybavovat informace z rozsáhlého kontextového okna slouží syntetický evaluační test *Needle In A Haystack* (NIAH -- „jehla v kupce sena“). Princip spočívá ve vložení izolovaného, na kontextu nezávislého faktu (např. unikátního klíče či specifického nastavení konfigurace) do různé relativní hloubky (od 0 % do 100 %) dlouhého distraktoru textu (čítajícího desítky tisíc až miliony tokenů). Model je následně vyzván k zodpovězení dotazu, jehož vyřešení závisí výhradně na této vložené informaci.

Zatímco moderní frontier modely dosahují na jednoduchém syntetickém testu NIAH téměř stoprocentní úspěšnosti napříč celou délkou okna, v reálném softwarovém vývoji vyvstává zásadní omezení: práce v repozitáři vyžaduje tzv. *Multi-Needle Reasoning* — schopnost současně nalézt, propojit a logicky syntetizovat několik vzájemně závislých informací (např. signaturu funkce v jednom modulu, její volání v druhém a konfigurační flag ve třetím). V takovém scénáři se naplno projevuje degradace pozornosti: s rostoucím objemem historie v kontextovém okně rapidně klesá spolehlivost křížového uvažování, což v dlouhých agentních sezeních vede k přehlédnutí okrajových podmínek a regresi v kódu.
]

==== KV Caching

#confirmed[
KV caching slouží ke snížení výpočetní náročnosti modelu při generování tokenů. Místo toho, abychom při každém kroku inference znovu od začátku počítali pozornost pro celou dosavadní konverzaci, ponechává inferenční engine v paměti uložené již vypočtené vektory klíčů a hodnot (_Key-Value pairs_) a v každém kroku počítá a přidává pouze nově vygenerovaný token.
]

=== Prompt a kontextové inženýrství

#confirmed[
_Prompt engineering_ (inženýrství promptů) je disciplína zaměřená na systematický návrh, formulaci a optimalizaci textových instrukcí předkládaných modelu @anthropic-prompt. V autonomních agentních systémech nepředstavuje prompt pouhou volnou konverzaci, ale slouží jako závazný kontrakt vymezující chování, práva a bezpečnostní mantinely agenta. Mezi klíčové techniky patří:

- *Systémový prompt (System Prompt)*: Základní direktiva definující identitu agenta, dostupné nástroje a striktní provozní pravidla (např. pravidla pro zachování neměnnosti existujících testů, konvence pro formát commitů či zákaz destruktivních operací v repozitáři).
- *Few-shot prompting*: Technika vložení několika vzorových příkladů (vstup-výstup) přímo do kontextu. Tím model získá konkrétní představu o požadovaném schématu (např. syntaxi konfiguračního souboru `darkfactory.json`) bez nutnosti dodatečného dotrénování parametrů.
- *Chain-of-Thought (myšlenkový řetězec)*: Vedení modelu k explicitní formulaci mezikroků a vnitřní dedukce před vygenerováním konečného kódu či akce. Rozklad komplexního zadání na postupné logické kroky zásadně potlačuje halucinace a tvoří základ fáze rozvahy (_Thought_) v cyklu ReAct.
- *Injekce dynamického kontextu*: Průběžné doplňování promptu o aktuální stav repozitáře, stromovou strukturu souborů, chybové výpisy kompilátoru a výsledky testů, díky čemuž agent operuje nad reálnými fakty namísto odhadů.
]

#added[
==== Úskalí negativních instrukcí a princip afirmativního vymezení

Zvláštní výzvou při formulaci systémových pravidel a zadání úkolů je definice omezujících podmínek pomocí zákazů a negativních instrukcí (např. „nikdy nemaž existující testy“, „neupravuj soubory mimo složku src“). V praxi je empiricky prokázáno, že jazykové modely negativní příkazy často porušují nebo zcela ignorují.

Tento jev má hluboké opodstatnění v samotném matematickém fungování mechanismu pozornosti transformeru:
1. *Pozornost zaměřená na přítomná slova*: Matice pozornosti ($Q K^T$) vyhodnocuje sémantickou relevanci na základě *přítomných* tokenů. Zmínka zakázané operace (např. `test_suite.py` ve větě „Za žádných okolností nemaž test_suite.py“) aktivuje v embeddingovém prostoru silné vektorové asociace k danému souboru i k operaci smazání.
2. *Asymetrie negace v autoregresivní predikci*: Negace představuje logický operátor vysokého řádu vyžadující složenou kompozici významu. Při autoregresivním generování token po tokenu však model často podlehne silnější statistické asociaci mezi přítomnými sémantickými pojmy dříve, než uplatní logický kontext záporové částice.

V robustním inženýrství agentních systémů se proto uplatňují dva komplementární principy:
- *Afirmativní formulace pravidel*: Pravidla se namísto zákazů formulují pozitivním vymezením požadovaného chování a mantinelů (např. „Upravuj výhradně soubory deklarované v seznamu `target_files`“, „Před jakoukoli změnou ověř běh stávajících testů“).
- *Deterministická exekuční ochrana v harnessu*: Bezpečnostní mantinely a zákazy destruktivních operací nesmí záviset na poslušnosti jazykového modelu vůči promptu. Řídicí harness systému DarkFactory proto prosazuje striktní omezení deterministicky na úrovni běhového prostředí — např. připojením chráněných cest v souborovém systému pouze pro čtení (_read-only mount_), sandboxováním exekuce terminálových příkazů a nezávislou validací změn v pull requestu před sloučením.
]

=== Agent vs Chatbot

#confirmed[Fundamentální rozdíl mezi chatbotem a agentem spočívá v rozsahu interakce s okolním světem: zatímco chatbot operuje výhradně v uzavřeném konverzačním rozhraní a generuje textové odpovědi, agentem se systém stává ve chvíli, kdy je vybaven sadou výkonných nástrojů (_tools_). Prostřednictvím nich dokáže aktivně zkoumat repozitář, vyhledávat informace na webu, modifikovat soubory a autonomně vykonávat příkazy v cílovém výpočetním prostředí.]

=== Harness a System Prompt

#confirmed[
Harness je řídicí program obklopující jazykový model. Odlišuje se od inferenčního jádra (_inference engine_), které provádí samotné maticové výpočty sítě: harness má na starost rozhraní mezi uživatelem a agentem či chatbotem, předávání systémového promptu, bezpečné spouštění nástrojů a řízení iterativní smyčky neboli ReAct smyčky. Mezi typické příklady patří webová aplikace ChatGPT, terminálové rozhraní Claude Code, desktopová aplikace Codex a další agentní prostředí.
]

=== ReAct smyčka

#draft[
Smyčka ReAct (_Reasoning and Acting_) tvoří základní stavební kámen, který z jazykového modelu vytváří autonomního agenta namísto pouhého pasivního generátoru textu @yao2022. Princip nespočívá v pouhém přečtení vstupu a vykonání akce, nýbrž v soustavné alternaci vnitřní rozvahy (_Reasoning_ neboli _Thought_) a vnějšího jednání (_Acting_ neboli _Tool Call_). Model v každém kroku nejprve formuluje hypotézu či myšlenkový postup, na jehož základě provede cílenou akci.

Po vykonání akce harness připojí vrácený výsledek (_Observation_) do kontextového okna na konec logu konverzace. V navazujícím kroku inference model zhodnotí nový stav a cyklus opakuje, dokud úkol není vyřešen nebo dokud nerozhodne, že má dostatek podkladů pro předání finální odpovědi uživateli. Tímto způsobem je dosaženo adaptivního řešení problémů namísto jednorázové slepé generace.
]

#figure(
  image("../img/react-loop.svg", width: 100%),
  caption: [Architektura autonomní ReAct smyčky (Reasoning + Acting) a tok dat mezi uživatelem, kontextem, modelem a výkonným prostředím.],
) <fig-react-loop>

#draft[
Diagram na @fig-react-loop znázorňuje základní iterativní cyklus moderních autonomních agentů. Po přijetí uživatelského zadání dochází v rámci inference k fázi rozvahy (_Reasoning_), kdy model formuluje vnitřní myšlenkový postup (_Thought_). Pokud je k vyřešení kroku zapotřebí externí akce, model vygeneruje strukturované volání nástroje (_Tool Call_). Řídicí harness tento požadavek zachytí, bezpečně vykoná v cílovém prostředí (terminál, souborový systém, API či MCP server) a vrácený výsledek (_Observation_) připojí na konec kontextového okna. Celý aktualizovaný kontext je následně předložen modelu v další iteraci, dokud není úkol kompletní a výsledek předán uživateli. Tento princip byl formálně zaveden v práci _ReAct: Synergizing Reasoning and Acting in Language Models_ (@yao2022, #link("https://arxiv.org/abs/2210.03629")[arXiv:2210.03629]).
]

#critique[Absence bezpečnostních pojistek proti nekonečnému cyklu: Popis ReAct smyčky v sekci 2.3.8 uvádí, že cyklus se opakuje, dokud úkol není vyřešen nebo dokud model nerozhodne o předání odpovědi. V praxi však LLM velmi často upadají do perseverace a opakovaného volání téhož neúspěšného nástroje se stejnými parametry. Text postrádá teoretickou analýzu detekce uvíznutí (stuck detection), maximálního limitu tahů (step budget) a deterministického přerušení divergence ze strany řídicího harnessu.]

=== Vyvolávání nástrojů

#draft[
Abychom z jazykového modelu vytvořili autonomního agenta, musíme jej vybavit rozhraním pro interakci s okolním prostředím — tzv. nástroji (_tools_). V praxi existují dva převažující přístupy k realizaci nástrojů:

1. *Strukturované volání nástrojů (Function / Tool Calling v JSON)*: Model ve svém výstupu zanechá strukturované volání odpovídající schématu zadanému v definici nástroje. Řídicí harness toto volání zachytí, vykoná požadovanou funkci a vrátí výsledek zpět agentovi opět jako strukturovaná data. Tato možnost je spolehlivá pro jednoúčelové operace (např. integraci do podnikových systémů či zákaznické podpory — angl. _customer support_). Pro komplexní softwarový vývoj však představuje nevýhodu vysoká režie formátu JSON: velké množství formátovacích znaků se převádí na tokeny, což zbytečně plní kontextové okno a může vést k degradaci pozornosti (_Context Rot_).

2. *Přímé spouštění kódu (Code Execution)*: Druhou možností je poskytnout agentovi plnohodnotné běhové prostředí (např. Bash, Python či TypeScript). Agent vygeneruje kód pro splnění svého záměru a harness jej spustí buď po jednotlivých příkazech, nebo jako ucelený skript. Z bezpečnostních důvodů je nezbytné, aby agent nepracoval přímo na nechráněném hostitelském počítači, nýbrž ve virtuálním prostředí odděleném bezpečnostní vrstvou — tzv. sandboxu (pískovišti). Tento způsob je pro softwarový vývoj nejefektivnější.
]

#critique[Iluzorní bezpečnost pískoviště: Druhý přístup (přímé spouštění kódu v kontejneru) práce nekriticky prezentuje jako „nejefektivnější“, zamlčuje však gigantická bezpečnostní a operační rizika. Běžný Docker kontejner není plnohodnotná bezpečnostní hranice (_security boundary_). Spuštění netestovaného kódu generovaného modelem s přístupem k síti otevírá prostor pro útoky typu Server-Side Request Forgery (SSRF), úniky tajných environmentálních proměnných (GitHub tokeny, API klíče k LLM poskytovatelům) přes postranní síťové kanály a nevratné poškození repozitáře. Práce postrádá jakoukoli analýzu formální izolace (např. microVM architektury jako AWS Firecracker, gVisor či striktní network namespaces) a nezodpovídá otázku, co zabrání kompromitovanému modelu zneužít CI runner jako odrazový můstek pro kompromitaci infrastruktury.]

=== Dovednosti, skripty a záchytné body

#confirmed[
Tyto standardy vznikly proto, aby vývojáři mohli modulárně upravovat chování agenta a rozšiřovat jeho schopnosti pro specifické doménové úlohy:

- *Dovednost (_Skill_)*: Samostatný adresář sdružující instrukce, reference a pomocné soubory. Klíčovým prvkem je soubor `SKILL.md`, který využívá hlavičku v metadatovém formátu YAML frontmatter (ohraničenou trojicí pomlček `---`). V hlavičce je definován název a stručný popis dovednosti. Řídicí harness do základního systémového promptu vkládá pouze tato metadata; samotný text podrobného návodu se do kontextu načte až ve chvíli, kdy agent danou dovednost vyvolá. Tím se efektivně šetří kapacita kontextového okna.
- *Skript (_Script_)*: Jednoúčelový spustitelný program (např. v jazyce Python či Bash). Skripty jsou pro efektivitu práce vitální: agent nemusí generovat každý příkaz z paměti, ale spouští deterministické a otestované postupy pro analýzu a transformaci kódu.
- *Záchytný bod (_Hook_)*: Skript, který se v harnessu automaticky vyvolá při určité systémové události či stavovém přechodu (např. při inicializaci sezení, před odesláním promptu modelu nebo při selhání nástroje). Hooky umožňují vynucovat bezpečnostní pravidla a logování nezávisle na vůli samotného modelu.
]

=== MCP Server

#confirmed[
Model Context Protocol vznikl v laboratořích společnosti Anthropic jako standardizovaný způsob pro efektivní interakci agentů s API servery. Ve své podstatě se jedná o nástroje postavené na rozhraní externího API, tudíž protokol sjednocuje různé standardy do jediného otevřeného rozhraní a přidává kontext — metadata pro každou přítomnou metodu, aby agent předem věděl, co od ní očekávat, a nemusel sám odhadovat fungování backendu.

Praktický význam specifikace Model Context Protocol @anthropic-mcp spočívá ve sjednocení dříve fragmentovaného ekosystému proprietárních rozhraní a jednoúčelových integračních skriptů. Řídicí harness se díky standardu stává univerzálním klientem a veškeré externí schopnosti, datové zdroje či nástroje se integrují jako samostatné procesy — tzv. MCP servery. Komunikace probíhá přes standardizovaný protokol JSON-RPC, a to buď lokálně prostřednictvím standardního vstupu a výstupu (`stdio`), nebo vzdáleně pomocí protokolu HTTP se Server-Sent Events (`SSE`). Tento modulární přístup striktně odděluje běhové prostředí agenta od samotné implementace nástrojů: libovolnou schopnost (např. přístup k databázi, vyhledávání v repozitáři nebo správu GitHub úkolů) stačí naimplementovat jednou a lze ji okamžitě zpřístupnit jakémukoli kompatibilnímu agentovi bez nutnosti zásahu do kódu samotného harnessu.
]

=== Meta Harness

#confirmed[V reálném světě se ukázalo, že nejefektivnější harness je takový, který dá samotnému agentovi rozhodovací pravomoc nad vlastní architekturou a umožňuje kontinuální změnu, tedy samořízenou evoluci @metaharness2026. Tento přístup je mimořádně efektivní pro maximalizování pracovní kapacity agenta, v praxi se však hodí především pro osobního agenta. U komerčních nasazení, jako je zákaznická podpora (_customer support_), provozovatel naopak striktně vyžaduje deterministické mantinely a vylučuje, aby model modifikoval své vlastní provozní instrukce.]

=== Subagenti

#confirmed[Když je agent vybaven nástrojem umožňujícím vyvolat další specializovanou instanci jazykového modelu, zadat jí dílčí úlohu, asynchronně s ní komunikovat a sledovat její postup, efektivita řešení rozsáhlých softwarových problémů dramaticky roste. V teorii autonomních systémů se tyto delegované entity označují jako subagenti (_subagents_).

Tato architektura umožňuje hierarchickou dekompozici problému: hlavní koordinační agent (_orchestrator_) udržuje globální strategii a pověřuje úzce profilované subagenty izolovanými činnostmi — například rešerší dokumentace, prozkoumáním rozsáhlého adresářového stromu repozitáře nebo syntaktickou opravou konkrétního modulu. Zásadní architektonickou výhodou je ochrana a izolace kontextového okna: rozsáhlý a výpočetně náročný průzkumný kontext subagenta se po dokončení úkolu zahodí a rodičovskému orchestrátoru je předán pouze syntetizovaný, čistý výsledek. Tím se zabraňuje zahlcení primárního kontextu (_context pollution_) a degradaci kognitivních schopností hlavního agenta.]

=== Workflows neboli Graph Engineering

#confirmed[Jakmile se snažíme organizovat nebo automatizovat úlohu složitější než několik přímočarých kroků, lineární sekvence promptů přestává stačit. V takovém okamžiku přicházejí na řadu pracovní postupy (_workflows_), v teoretické informatice reprezentované jako grafy. Grafy se v softwarovém vývoji používají v mnoha situacích. Graf se skládá z uzlů (_nodes_) a hran (_edges_) — v kontextu agentních systémů každý uzel představuje izolovaného agenta s připraveným systémovým promptem, dovednostmi a nástroji, zatímco spoje mezi nimi vymezují tok informací a posloupnost práce. Abstrakcí tohoto grafového systému jsme schopni tuto pipeline nasadit na libovolnou úlohu, a to i dynamicky za pomoci orchestrace nadřazeným agentem.]

#draft[
Tento koncept se v informatice označuje jako orientovaný acyklický graf (*DAG* — _Directed Acyclic Graph_). Uzly grafu představují samostatné, specializované výpočetní kroky či izolované agenty, zatímco orientované hrany určují pořadí závislostí a tok kontextových informací. V moderních orchestrátorech a CI/CD platformách (zejména v GitHub Actions) se závislosti mezi úlohami deklarují pomocí direktivy `needs: [...]`.

Jak podrobně rozvádí praktická část této práce na architektuře systému DarkFactory, celý životní cyklus automatizovaného požadavku je strukturován právě jako DAG složený z pěti klíčových fází:
1. *Detekce a kontext*: rozpoznání prostředí projektu, načtení konfiguračního souboru `darkfactory.json` a příslušných systémových pravidel.
2. *Interpretace a plánování*: formulace přesného technického postupu a vytvoření plánovacího úkolu dříve, než dojde k samotnému zásahu do kódu.
3. *Implementace (kódování)*: spuštění agenta s přesně vymezenou sadou nástrojů v izolované větvi repozitáře.
4. *Verifikace a testování*: automatické sestavení projektu, spuštění testovací sady a kontrola kvality změn.
5. *Schvalovací brána (Governance)*: podmíněné zastavení toku grafu a vyžádání lidské kontroly před finálním sloučením pull requestu.

Zásadní předností grafového uspořádání je determinismus a striktní bezpečnost: pokud kterýkoli uzel selže (např. automatizované testy detekují regresi), exekuce se v dané větvi grafu okamžitě přeruší a navazující kroky se nespustí, což zabraňuje poškození hlavní vývojové linie.
]

== Human in the loop neboli člověk ve smyčce

#confirmed[
Čím je systém samostatnější, tím důležitější je otázka, kde do procesu vstupuje
člověk. Úplná autonomie není cílem; cílem je autonomie v rutinních krocích
a lidské rozhodnutí tam, kde je nevratné nebo kde chybí měřítko správnosti.
]

=== Schvalovací body

#confirmed[
Schvalovací bod je místo, kde se proces zastaví a čeká na potvrzení. Jeho
umístění je kompromisem: příliš mnoho schvalování popírá smysl automatizace,
příliš málo znamená ztrátu kontroly. Osvědčeným řešením je schvalovat _záměr_
(co se má udělat) a _plán_ (jak se to má udělat) dříve, než vznikne kód.
]

=== Dohledatelnost

#confirmed[
Aby byla automatizovaná změna přezkoumatelná, musí být zřejmé, z jakého
požadavku vzešla. Uchování doslovného znění původního zadání je proto součástí
návrhu, nikoli formalitou: parafráze ztrácí význam, který do zadání vložil ten,
kdo je formuloval.
]

=== Eskalace a transparence selhání

#confirmed[Systém, který své vlastní selhání zamlčí nebo zamete pod koberec, je nebezpečnější než systém, který zjevně havaruje: nespolehlivost se v něm stává neviditelnou a postupně eroduje důvěru uživatele v celý autonomní provoz. V konceptu člověka ve smyčce proto hlášení chyb a eskalace selhání netvoří pouhý doplňkový technický detail, nýbrž fundamentální bezpečnostní pilíř. Pokud autonomní agent narazí na vyčerpání kontextového okna, syntaktickou chybu neřešitelnou v rámci rozpočtu tahů nebo selhání integračních testů, nesmí skončit tichým uváznutím či nekonečným cyklem. Místo toho musí harness deterministicky zachytit chybový stav, sestavit strukturovaný diagnostický protokol (obsahující chybový stack trace, diff provedených změn a stav kontextu) a srozumitelně jej eskalovat člověku formou notifikace či dedikovaného incidentu. Tím je zajištěna plná observabilita a okamžitá lidská dohledatelnost.]


