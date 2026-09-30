#import "../components/terms.typ": term, term-name

#heading(level: 2)[#term-name("Software Factory", cs: "softwarová továrna")] <software-factory>

#term("Software Factory", cs: "softwarová továrna", definition: "Vývojové prostředí, které převádí tvorbu softwaru do co nejvíce řízeného, opakovatelného a nástroji podporovaného procesu.") není nový pojem. Robert W. Bemer jej už na konferenci NATO o softwarovém inženýrství v roce 1968 popsal jako #emph[machine-controlled production environment, or software factory] @nato1969. Program, jeho kontrola i používání měly probíhat uvnitř společného prostředí vybaveného nástroji pro práci se soubory, kompilaci, testování a sestavení systému.

Tradiční automatizace funguje nejlépe tam, kde lze postup předem přesně popsat programem. #term-name("Coding Agents", cs: "coding agenti") tuto hranici posouvají, protože model může podle aktuálního stavu volit další kroky a používat nástroje i tehdy, když celý postup není dopředu pevně určen. Softwarová továrna tak může spojit deterministickou automatizaci, agentní kroky a lidské rozhodování.

Takové uspořádání se již používá v produkčním softwarovém inženýrství. Stripe uvádí, že jeho interní agenti Minions pravidelně vytvářejí požadavky na sloučení určené k lidské revizi @stripe-minions-2026. Meta popisuje vlastní agentní platformu, která automatizuje hledání a opravu výkonnostních problémů a dovádí proces až k požadavku na sloučení připravenému pro člověka @meta-capacity-efficiency-2026.

DarkFactory představuje záměrně jednoduchý #term("Bootstrap", cs: "počáteční základ", definition: "Minimální funkční verze systému, která už dokáže podporovat nebo řídit svůj další vývoj.") tohoto přístupu. Počáteční implementace už dokáže agenty spouštět a řídit v repozitářovém procesu a současně vytváří základ pro další rozvoj stejným způsobem.
