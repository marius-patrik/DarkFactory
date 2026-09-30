#import "../components/terms.typ": term, term-name

#heading(level: 2)[#term-name("Agent") – co to je a jak funguje] <theory-first>

#term("Agent", definition: "Systém, v němž model prostřednictvím nástrojů jedná nad prostředím.") je model doplněný o #term("Harness", cs: "agentní harness", definition: "Vrstva kolem modelu, která mu předává kontext, nástroje, oprávnění, stav a pravidla běhu.") @langchain-harness. Model navrhuje další krok a agentní vrstva zajišťuje, aby se tento návrh mohl bezpečně změnit v akci. Model je proto jen jednou vrstvou širšího systému. Rozvrstvení shrnuje @fig-harness-layers.

#figure(
  image("/components/img/harness-layers.svg", width: 100%),
  caption: [Vrstvy agentického systému.],
) <fig-harness-layers>

#heading(level: 3)[#term-name("Large Language Model", cs: "jazykový model")]

#term("Large Language Model", cs: "jazykový model", definition: "Model, který z kontextu odhaduje pravděpodobnosti následujících tokenů.") je výpočetní jádro agenta. Současné modely běžně používají architekturu #term("Transformer", definition: "Neuronová architektura založená na mechanismu pozornosti, která zpracovává vztahy mezi tokeny v kontextu.") představenou v roce 2017 @vaswani2017.

Jejím základem je #term("Attention", cs: "pozornost", definition: "Mechanismus, který při výpočtu reprezentace tokenu váží informace z dalších tokenů v kontextu."). Každý token tak může při své reprezentaci využít informace z ostatních pozic. U standardní plné pozornosti rostou výpočetní náklady přibližně s druhou mocninou délky kontextu.

Model sám mezi jednotlivými voláními neudržuje pracovní stav a bez okolního systému nemá přístup k souborům, příkazům ani nástrojům. Při #term("Inference", cs: "inference", definition: "Použití natrénovaného modelu k vytvoření výstupu z aktuálního vstupu.") zpracuje aktuální kontext a vytváří výstupní tokeny. Trvalý stav, nástroje a oprávnění proto musí dodat okolní agentní vrstva.

#term("Embedding", cs: "vektorová reprezentace", definition: "Číselný vektor, který zachycuje vlastnosti nebo význam objektu tak, aby podobné objekty ležely v prostoru blízko sebe.") umožňuje reprezentovat sémantické vztahy ve vektorovém prostoru. Známým příkladem je vztah mezi slovy král, královna, muž a žena @mikolov2013linguistic @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 100%),
  caption: [Sémantické vztahy ve vektorovém prostoru @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[#term-name("Agent Loop", cs: "agentní smyčka")]

#term("Agent Loop", cs: "agentní smyčka", definition: "Opakovaný cyklus, v němž model vyhodnotí stav, zvolí další akci, obdrží její výsledek a pokračuje.") propojuje jednotlivá volání modelu. Často využívá vzor #term("ReAct", cs: "Reasoning and Acting", definition: "Vzor střídající uvažování modelu, akci nad prostředím a pozorování výsledku.") @yao2022.

Jeden cyklus lze zjednodušit do pěti kroků

- sestavit kontext — systémové pokyny, dosavadní průběh a stav prostředí
- nechat model odpovědět
- provést požadovaný nástroj
- zapsat výsledek jako pozorování
- vrátit se k dalšímu kroku

Agentní vrstva provádí akci mimo model a výsledek vrací zpět do kontextu. Smyčka pokračuje, dokud model nevydá závěrečnou odpověď místo dalšího požadavku na nástroj. Průběh shrnuje @fig-react-loop.

#figure(
  image("/components/img/react-loop.svg", width: 100%),
  caption: [#term-name("ReAct") @yao2022.],
) <fig-react-loop>

#heading(level: 3)[#term-name("Tools", cs: "nástroje")]

Zadání určuje, co má agent udělat, zatímco agentní vrstva určuje, co skutečně může provést @langchain-harness.

- #term("Tools", cs: "nástroje", definition: "Funkce zpřístupněné modelu pro práci s prostředím, například čtení souborů, vyhledávání nebo spouštění příkazů.") umožňují agentovi přímo měnit nebo zjišťovat stav prostředí @anthropic2024tooluse
- #term("Skills", cs: "dovednosti", definition: "Opakovaně použitelné balíčky instrukcí, skriptů a zdrojů pro určitý typ úlohy.") spojují instrukce a pomocné prostředky @agentskills-spec
- #term("Hooks", cs: "háčky", definition: "Programové reakce na události životního cyklu, které mohou před akcí nebo po ní vynutit další krok.") doplňují běh o deterministické zásahy @openai-agents-lifecycle
- #term("Model Context Protocol", cs: "protokol modelového kontextu", definition: "Standard klient–server pro připojování externích nástrojů a datových zdrojů k agentním systémům.") standardizuje připojení externích zdrojů @mcp-specification

Každá akce může být navíc řízena oprávněním, které ji povolí automaticky, vyžádá souhlas člověka nebo ji zakáže.

Projektové instrukce lze verzovat přímo s repozitářem. #term("AGENTS.md", definition: "Standardní soubor s projektovými instrukcemi určenými agentům.") poskytuje společné místo pro příkazy sestavení, testy a konvence @agents-md. #term("Agent Skills", cs: "dovednosti agentů", definition: "Otevřený formát pro adresáře opakovaně použitelných schopností agenta.") používají soubor #term("SKILL.md", definition: "Vstupní soubor jedné dovednosti agenta, který popisuje její použití a dostupné zdroje.") @agentskills-spec.

#heading(level: 3)[#term-name("Context", cs: "kontext")]

#term("Context Window", cs: "kontextové okno", definition: "Množství vstupních a průběžných informací, které může model zpracovat v jednom běhu.") obsahuje instrukce, části repozitáře, historii nástrojů i výsledky předchozích kroků. Samotná velikost okna nezaručuje správné využití všech informací. Výkon modelů může klesat například tehdy, když se důležitá informace nachází uprostřed dlouhého vstupu @liu2024.

Postupné zhoršování využitelnosti příliš rozsáhlého kontextu se označuje jako #term("Context Rot", cs: "degradace kontextu", definition: "Zhoršování schopnosti modelu využít relevantní informace s rostoucím nebo nekvalitním kontextem.") @anthropic-context-engineering. Jedním z řešení je #term("Compaction", cs: "kompakce", definition: "Nahrazení starší části průběhu kratším souhrnem důležitých rozhodnutí, výsledků a otevřených úkolů."), která zmenší historii a zachová jen podstatný stav @anthropic-context-engineering.

Dlouhodobý autoritativní stav je proto vhodné uchovávat mimo samotný přepis konverzace a do pracovního kontextu v každém kroku vybírat jen aktuální informace potřebné pro danou úlohu.
