#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": section
#import "/DarkFactory/manuscript/introduction/motivation/evidence.typ": adoption_figure, eci_figure

#let item = section(
  key: "motivation_problem_definition",
  title: [Motivace a vymezení problému],
  definition: terms => [
Současné agentní systémy dokážou nad softwarovým projektem provádět více navazujících kroků, pracovat se soubory a nástroji a ověřovat vlastní změny. Jejich praktická schopnost proto nezávisí pouze na generování kódu, ale také na technické vrstvě, která propojuje model s prostředím, stavem, nástroji a kontrolními mechanismy. #cite(bib.anthropic2024tooluse) #cite(bib.anthropic_harness_design)
  ],
  description: terms => [
Používání generativní AI je už globálně rozšířené. Gradually ve svém srpnovém odhadu z roku 2026 rozděluje světovou populaci do čtyř vzájemně výlučných kategorií podle nejpokročilejšího způsobu používání AI: 1 771 z 2 500 bodů připadá na lidi, kteří generativní AI nikdy vědomě nepoužili, 696 na uživatele bezplatných chatbotů, 24 na platící uživatele a 9 na pravidelné uživatele AI coding agents. #cite(bib.gradually_ai_usage_2026)

#adoption_figure

Poslední kategorie nesmí být čtena jako globální sčítání uživatelů. Gradually ji výslovně uvádí jako redakční, deduplikovaný odhad 25–35 milionů pravidelných uživatelů; vizualizace používá střed 30 milionů, tedy přibližně 0,36 % světové populace. #cite(bib.gradually_ai_usage_2026) Rozdíl mezi širokým používáním generativní AI a podstatně menším odhadovaným počtem uživatelů coding agents ukazuje, že pokročilé agentní použití zůstává relativně úzkou podmnožinou celkové adopce.

Současně se zvyšují schopnosti samotných modelů. Epoch AI na datech Epoch Capabilities Index (ECI) zpřístupněných k 1. září 2026 odhaduje po nástupu reasoning modelů v září 2024 tempo posunu frontier přibližně 14 ECI bodů za rok, zatímco pro non-reasoning frontier přibližně 6 bodů za rok. ECI je kompozitní index skládající více benchmarků do jedné škály schopností; nejde o univerzální měřítko inteligence. #cite(bib.epoch_eci_frontier_2026)

#eci_figure

S růstem modelových schopností se proto technická otázka posouvá od izolované tvorby textu nebo kódu k tomu, jak model zasadit do spolehlivého prostředí s nástroji, trvalejším stavem, ověřováním výsledků a orchestrací více kroků. #cite(bib.anthropic_context_engineering) #cite(bib.anthropic_harness_design)
  ],
)
