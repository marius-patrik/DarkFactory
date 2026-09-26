// Chapter 1, including 1.1 Aim and scope.
#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní v editoru přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak většina uživetelů nemá představu čeho tyto nástroje jsou skutečně schopny. Většina populace se s generativní AI setkává jenom na povrchu prostřednictvím chatbotů a to bezplatným tedy omezeným přístupem. Odhad zdroje klade počet uživatelů chatbotů na 28% populace zatímco pravidelné užití AI coding agents pouze na 0,36~% světové populace@gradually-ai-usage-2026.

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu. Hodnota 30 milionů pravidelných uživatelů coding agents, přibližně 0,36~% světové populace, je redakční střed odhadovaného rozmezí 25--35 milionů @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

#box[
  #set par(justify: true)
  #strong[Poznámka k terminologii.] Anglické #strong[agentic] nemá v češtině ustálený překlad; pro potřeby této práce je mu přiřazeno tvořené přídavné jméno #strong[agentické]. Rozdíl mezi dvěma výrazy, které se v běžném užívání zaměňují, je přitom zásadní. #strong[Agentní] označuje vlastnost agenta, tedy toho, kdo jedná; #strong[agentický] označuje vlastnost systému, tedy toho, kdo je *schopen* jednat. Jazykový základ tomu odpovídá: anglické #strong[agentic] je odvozeno od podstatného jména #strong[agent] příponou #strong[-ic] a znamená mající schopnost, prostředky nebo pravomoc jednat, nikoli samo jednajícího @mw-agentic. V této práci je proto #strong[agentické] užíváno výhradně v druhém smyslu: agentické inženýrství není stavbou agentů, ale návrhem systémů, které se takovým chováním vyznačují.
]


#heading(level: 2)[Cíl a vymezení] <intro-goal>

Cílem práce je ukázat, jak harness dělá z jazykového modelu autonomního agenta a jaké postupy umožňují využívat agenty účinně a kontrolovaně.

Praktická část analyzuje DarkFactory, jednoduchou produkční pipeline pro AI-asistovaný softwarový vývoj. GitHub je v ní vývojovým prostředím, GitHub Actions zajišťuje běhy, Docker kontejner odděluje prostředí, Github Issues slouží jako plánovací/stavový systém a pythonovský řadič ve spolupráci s produkčními harnessy (#strong[`claude`], #strong[`agy`], #strong[`codex`], #strong[`opencode`]) realizuje interpretaci, plánování, implementaci, revizi a integraci změn. Jejich skutečná rozhraní uvádí @architektura.
