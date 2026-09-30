#import "../components/terms.typ": term-name

#heading(level: 1)[Úvod]

#heading(level: 2)[Motivace – vývoj a adopce generativní AI] <motivace>

Od svého vzniku se nástroje založené na jazykových modelech neustále zlepšují a roste také jejich adopce. Jednou z prvních široce používaných forem ve vývoji softwaru bylo doplňování kódu přímo v editoru @github-copilot-completion, jehož příklad ukazuje @fig-copilot-inline.

#figure(
  image("/components/img/vscode-copilot-inline-suggestions.png", width: 100%),
  caption: [Doplňování kódu v editoru @github-copilot-completion.],
) <fig-copilot-inline>

Potom přišly konverzační chatboty, v nichž model sestavuje odpověď, ale nástroje mu zpravidla nebyly k dispozici, takže další práci stále prováděl uživatel. Tento způsob použití ilustruje @fig-chatgpt-cannot-see.

#figure(
  image("/components/img/chatgpt-cannot-see-image.jpg", width: 100%),
  caption: [Chatbot bez přístupu k obrázku @khurana2023chatgpt.],
) <fig-chatgpt-cannot-see>

Další posun představují #term-name("Coding Agents", cs: "coding agenti") @github-copilot-agent @openai-codex-2025 @openai-codex-app-2026, kteří mohou získat přístup k souborům, příkazům a běhovému prostředí. Model tak již nejen navrhuje výsledek, ale může prostřednictvím nástrojů sám provádět jednotlivé kroky práce.

#figure(
  image("/components/img/gradually-ai-usage-2026.svg", width: 100%),
  caption: [Odhad využití generativní AI podle typu @gradually-ai-usage-2026.]
) <fig-gradually-usage>

Podle jednoho zveřejněného odhadu používá bezplatné AI chatboty přibližně 28~% světové populace, zatímco pravidelní uživatelé coding agentů tvoří přibližně 0,36~% @gradually-ai-usage-2026 @fig-gradually-usage. Agentické nástroje jsou tedy stále výrazně méně rozšířené než běžné konverzační použití generativní AI. Motivací této práce je proto ukázat, čeho lze s těmito nástroji dosáhnout při použití současných postupů agentického inženýrství.

#heading(level: 2)[Cíl, výzkumná otázka a vymezení] <intro-goal>

Cílem práce je popsat a systematizovat principy současného agentického inženýrství ve vývoji softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi. Pozornost je přitom věnována také způsobu, jakým lze coding agenty začlenit přímo do běžného repozitářového pracovního postupu. Takové propojení agentů s existujícími procesy vývoje se již používá v produkčním softwarovém inženýrství a představuje současnou podobu myšlenky softwarové továrny @stripe-minions-2026 @meta-capacity-efficiency-2026.

Výzkumná otázka práce zní — #emph[Jaké architektonické a procesní principy se opakují v současném agentickém vývoji softwaru a jak jsou realizovány v systému DarkFactory?]

Práce vychází z předpokladu, že jazykový model je v současných agentických systémech pouze jednou částí širšího celku. Praktické použití coding agentů proto závisí také na způsobu práce s kontextem, nástroji a trvalým stavem, na orchestraci jednotlivých kroků, automatickém ověřování a zapojení člověka do rozhodovacích bodů. Teoretická část tyto opakující se principy popisuje a praktická část ukazuje jejich propojení v jednom konkrétním systému.

Praktická část má podobu inženýrské případové studie DarkFactory, agentické softwarové továrny nativně postavené na GitHubu. Systém byl implementován pomocí komerčních coding agentů a je záměrně navržen jako jednoduchá počáteční implementace. Již v této podobě dokáže sama spouštět a řídit coding agenty a vytváří tak základ, který lze pomocí stejného procesu dále rozvíjet. Cílem případové studie není měřit obecnou úspěšnost jazykových modelů ani porovnávat jednotlivé coding agenty, ale popsat konkrétní realizaci současných postupů agentického inženýrství a ukázat, co jejich spojení umožňuje v praxi.
