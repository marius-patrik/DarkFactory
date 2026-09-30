// 2.3 Software factory.
#heading(level: 2)[Softwareová továrna] <software-factory>

#strong[Softwareová továrna] označuje prostředí, které převádí vývoj softwaru do co nejvíce řízeného a opakovatelného procesu. Samotná myšlenka není nová. Robert W. Bemer ji už na konferenci NATO o softwarovém inženýrství v roce 1968 popsal jako #emph[machine-controlled production environment, or software factory] @nato1969. V jeho návrhu měly konstrukce programu, jeho kontrola i používání probíhat uvnitř společného prostředí vybaveného potřebnými nástroji pro práci se soubory, kompilaci, testování a sestavení systému.

Tradiční automatizace se uplatňuje především tam, kde lze postup předem přesně popsat programem. Coding agenti tuto hranici posouvají: jazykový model může podle aktuálního stavu systému volit další kroky a používat nástroje i v úlohách, jejichž přesný postup není předem pevně určen. Softwareová továrna tak může kombinovat běžnou deterministickou automatizaci s agentními kroky a lidským rozhodováním.

Takové uspořádání se již používá v reálném softwarovém inženýrství. Společnost Stripe o svých interních agentech #emph[Minions] uvádí: #quote[Minions now ship over 1,000 PRs to production every week. In all these cases, humans just have to review and approve.] @stripe-minions-2026 Meta podobně popisuje vlastní agentní platformu, která automatizuje hledání a opravu výkonnostních problémů a dokáže dovést proces až k pull requestu připravenému k lidské revizi @meta-capacity-efficiency-2026.

DarkFactory, popsaná v praktické části této práce, představuje záměrně jednoduchý #strong[bootstrap] tohoto přístupu. Její počáteční implementace už dokáže coding agenty spouštět a řídit v rámci repozitářového workflow a zároveň vytváří základ, který lze pomocí stejné pipeline dále rozvíjet.
