// Chapter 1, including 1.1 Aim and scope.
#heading(level: 1)[Úvod]

Nástroje založené na velkých jazykových modelech prošly rychlým vývojem: od doplňování kódu při psaní v editoru přes konverzační chatboty až po autonomní agenty, kteří pomocí nástrojů samostatně provádějí změny a spouštějí příkazy v běhovém prostředí @github-copilot-completion @github-copilot-chat @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026. S rostoucími schopnostmi modelů roste i jejich adopce, avšak většina uživatelů nemá představu, čeho jsou tyto nástroje skutečně schopny. Většina populace se s generativní AI setkává jenom na povrchu prostřednictvím chatbotů, a to prostřednictvím bezplatného, tedy omezeného, přístupu. Odhad zdroje klade počet uživatelů chatbotů na 28% populace zatímco pravidelné užití AI coding agents pouze na 0,36~% světové populace @gradually-ai-usage-2026; @fig-gradually-usage tyto dvě skupiny odlišuje. 

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad rozdělení uživatelů generativní AI podle typu. Hodnota 30 milionů pravidelných uživatelů coding agents, přibližně 0,36~% světové populace, je redakční střed odhadovaného rozmezí 25--35 milionů @gradually-ai-usage-2026.],
) <fig-gradually-usage>

Aby mohl agent samostatně pracovat na projektu, nestačí pouhé generování odpovědí. Potřebuje kontext z repozitáře, přístup k prostředí, nástroje pro spouštění příkazů, uchování stavu mezi jednotlivými kroky a vymezený bod, v němž člověk rozhodne o přijetí výsledku @anthropic-harness-design @anthropic-managed-agents.

Význam klíčových pojmů, které se v českém prostředí neustálily, je zvlášť
sezbrán v @terminologie.


#heading(level: 2)[Cíl, výzkumná otázka a vymezení] <intro-goal>

Cílem práce je uvést čtenáře do problematiky agentického umělé inteligence: jak vznikla, co jí je, jak se dnes používá a jaké postupy umožňují předávat jí část práce ve vývoji softwaru. Práce vymezuje agentické inženýrství jako soubor těchto postupů a ukazuje, že jeho jádrem není schopnost modelu, ale návrh systému, v němž model pracuje. Druhou polovinou cíle je praktická demonstrace: postavit co nejjednodušší provozuschopnou softwareovou továrnu, která zobrazí právě ty části postupu, které jsou v dnešní praxi rozhodující.

Z toho vychází výzkumná otázka, na kterou práce odpovídá: #emph[je praktická autonomie ve vývoji softwaru dosažitelná také tehdy, když autor nevlastní smyčku agenta?] Tomu odpovídá hypotéza, že praktická autonomie je vlastností systému a nikoli agenta, a je tedy dosažitelná kombinací trvalého stavu uloženého mimo model, explicitních lidských bran a oddělené kontroly výstupu, aniž by bylo nutné psát si vlastní harness. Hypotéza se ověřuje v praktické části a z výsledku tohoto ověření práce vychází.

Praktická část popisuje DarkFactory, jednoduchou produkční pipeline pro AI-asistovaný softwarový vývoj. GitHub je v ní vývojovým prostředím, GitHub Actions zajišťuje běhy, Docker kontejner odděluje prostředí, Github Issues slouží jako plánovací/stavový systém a pythonovský řadič ve spolupráci s produkčními harnessy (#strong[`claude`], #strong[`agy`], #strong[`codex`], #strong[`opencode`]) realizuje interpretaci, plánování, implementaci, revizi a integraci změn. Jejich skutečná rozhraní uvádí @architektura.

Vymezení práce je záměrné a úzké: popisuje se pouze počáteční implementace této pipeline, v níž je smyčka agenta provedena cizím nástrojem. Její rozsah odpovídá zadání a slouží jako základ, na němž navazuje práce následující.

