// 2.4 Software factory.
//
// Two jobs. First, ground the term: it is a 1968 idea, not a 2026 marketing word,
// and saying so protects the thesis from reading as trend-following. Second, show
// that the architecture described in the practical part is the shape several
// independent systems converged on, so the claim that it is what teams actually
// build is evidenced rather than asserted.
#heading(level: 2)[Softwareová továrna] <software-factory>

Pojem softwareová továrna je starší než generativní umělá inteligence o přibližně padesát let. Zrodil se na konferenci NATO o softwarovém inženýrství v Garmischi v říjnu 1968, kde Robert Bemer navrhl strojově řízené výrobní prostředí, tedy software factory, které by poskytovalo prostředí pro veškerou konstrukci, kontrolu a provoz programů @nato1969. Návrh vycházel z porovnání programování s tovární výrobou a jeho ambicí byla industrializace opakujících se kroků.

Návrh se v následujících desetiletích ustálil v konkrétní podobě. Michael Cusumano popisuje factory concepts and practices, které zavedla Hitachi, Toshiba, NEC a Fujitsu: standardizaci vývojových metod, systematickou znovuvyužitelnost komponent, dělbu práce a kontrolu kvality, to vše za účelem přechodu od řemeslné práce k opakovatelnému procesu @cusumano1991factory. Podstatné je, co v tomto pojetí zůstává na člověku: továrna automatizuje provádění, nikoli rozhodování o tom, co se vyrábí.


#heading(level: 3)[Co posunuli agenti]

Agenti posunuli hranici, za kterou továrna končila. Zatímco klasická softwareová továrna automatizovala kroky, jejichž postup byl předem dán, agent vykoná i krok, jehož postup předem dán není: zadání přeformuluje, plán sestaví, chybu, kterou sám způsobí, opraví a rozhodne, zda je na řadě další nástroj. Automatizovatelná část se tím posouvá z provádění na úsudek, zatímco člověk zůstává tam, kde byl v každé dosavadní továrně — u určení, co je správné a co smí do výroby vstoupit.

Právě proto se pojem vrací do užívání. Současné popisy této architektury ji označují právě jako software factory: systém, v němž agenti nepřetržitě nacházejí práci, plánují ji, implementují, revidují a předávají výsledek člověku @factory2026 @bcg2026. Popisovaný průběh — událost spustí plánování, implementace probíhá na izolované větvi, revizi provádí oddělený krok, sloučení zůstává lidskou bránou — odpovídá tomu, co popisují i systémy postavené mimo tuto práci.

Odlišnost je přesto jednoznačná a je vhodné ji vyslovit. Společnost Guild, která takový systém provozuje a sama jej takto označuje, uvádí, že 34 % sloučených pull requestů vzniká autonomně, 56 % oprav kódu pochází z její factory a 91 % jejích sloučených pull requestů nevyžaduje zásah inženýra @guild2026. Jde ovšem o vlastní měření, nikoli o nezávislé ověření, a oproti popsanému stavu má architektura jednu zásadní odlišnost: plánování, implementaci a revizi u nich zajišťují oddělení agenti, zatímco v této práci jde o tytéž role v jediném harnessu, lišícím se pouze zadáním. Tvrzení o tom, že se tento průběh dnes stává běžnou praxí, lze opřít o průmyslové zprávy o šíření agentů do výroby @anthropic-agents-2026.

Z toho plyne i upřesnění, co práce sama přidává. Popsaná pipeline nevymýšlí softwareovou továrnu znovu; naopak se snaží ukázat, že i bez vlastního harnessu, jen s volenou sadou cizích nástrojů, lze její provozní podstaty dosáhnout. Tvrzení, že právě tato část je vlastním přínosem práce, je tedy formulováno jako demonstrace, nikoli jako novost.
