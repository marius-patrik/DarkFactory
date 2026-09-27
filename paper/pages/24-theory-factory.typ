// 2.4 Software factory.
//
// Two jobs. First, ground the term: it is a 1968 idea, not a 2026 marketing word,
// and saying so protects the thesis from reading as trend-following. Second, show
// that the architecture described in the practical part is the shape several
// independent systems converged on, so the claim that it is what teams actually
// build is evidenced rather than asserted.
#heading(level: 2)[Softwareová továrna] <software-factory>

Pojem softwareová továrna je starší než generativní umělá inteligence o přibližně padesát let. Zavedl jej Robert Bemer z General Electric ve svém návrhu strojově řízeného výrobního prostředí, který představil na konferenci NATO o softwarovém inženýrství v Garmischi v říjnu 1968. Zpráva z konference jeho formulaci cituje: „By utilizing the machine-controlled production environment, or software factory. Program construction, checkout and usage are done entirely within this environment using the tools it contains. Ideally it should be impossible to produce programs exterior to this environment.“ @nato1969
Konference se zabývala především softwarovou krizí, nikoli zavedením tohoto pojmu — sama o prvním užití neuvádí a pojem pouze připisuje Bemerovi @nato1969. Že pojem zavedl a vymezil jeho povahu, uvádí jeho biografie @bemer-chm. O jeho návrhu se na konferenci mluvilo jako o tom nejambicióznějším přístupu, jaký byl představen @randell1968.
Přitom se shodlo, že automatizace výroby sama o sobě úsudek neruší. „Human monitoring of production is very adaptive — the automated system may disguise some of what is happening“, upozorňoval Fraser @nato1969. „If you don't know what you're doing in producing software, then automating the system can be dangerous“, dodal Ross @nato1969. A McIlroy: „It would be immoral for programmers to automate everybody but themselves.“ @nato1969
O devět let později Bemer sám upřesnil, co továrna kromě nástrojů potřebuje: „One does not build a successful factory with just tools and environment. The workers must be trained, and the assembly methodology (e.g., drawings, parts lists, inventory) must be in place.“ @bemer1977factory


#heading(level: 3)[Co posunuli agenti]

Agenti posunuli hranici, za kterou továrna končila. Zatímco klasická softwareová továrna automatizovala kroky, jejichž postup byl předem dán, agent vykoná i krok, jehož postup předem dán není: zadání přeformuluje, plán sestaví, chybu, kterou sám způsobí, opraví a rozhodne, zda je na řadě další nástroj. Automatizovatelná část se tím posouvá z provádění na úsudek, zatímco člověk zůstává tam, kde byl v každé dosavadní továrně — u určení, co je správné a co smí do výroby vstoupit.

Právě proto se pojem vrací do užívání. Současné popisy této architektury ji označují právě jako software factory: systém, v němž agenti nepřetržitě nacházejí práci, plánují ji, implementují, revidují a předávají výsledek člověku @factory2026 @bcg2026. Popisovaný průběh — událost spustí plánování, implementace probíhá na izolované větvi, revizi provádí oddělený krok, sloučení zůstává lidskou bránou — odpovídá tomu, co popisují i systémy postavené mimo tuto práci.

Odlišnost je přesto jednoznačná a je vhodné ji vyslovit. Společnost Guild, která takový systém provozuje a sama jej takto označuje, uvádí, že 34 % sloučených pull requestů vzniká autonomně, 56 % oprav kódu pochází z její factory a 91 % jejích sloučených pull requestů nevyžaduje zásah inženýra @guild2026. Jde ovšem o vlastní měření, nikoli o nezávislé ověření, a oproti popsanému stavu má architektura jednu zásadní odlišnost: plánování, implementaci a revizi u nich zajišťují oddělení agenti, zatímco v této práci jde o tytéž role v jediném harnessu, lišícím se pouze zadáním. Tvrzení o tom, že se tento průběh dnes stává běžnou praxí, lze opřít o průmyslové zprávy o šíření agentů do výroby @anthropic-agents-2026.

Z toho plyne i upřesnění, co práce sama přidává. Popsaná pipeline nevymýšlí softwareovou továrnu znovu; naopak na záměrně minimálním provedení ukazuje, že její provozní podstaty lze dosáhnout volenou sadou cizích nástrojů. Tvrzení, že právě tato část je vlastním přínosem práce, je tedy formulováno jako demonstrace, nikoli jako novost.
