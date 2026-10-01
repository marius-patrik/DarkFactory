#import "../components/terms.typ": term, term-name

#heading(level: 2)[Agent – co to je a jak funguje] <theory-first>

U #term("Agent", definition: "Systém, v němž model prostřednictvím nástrojů jedná nad prostředím.") se rozhodování a provedení dělí mezi model a #term("Harness", cs: "agentní harness", definition: "Vrstva kolem modelu, která mu předává kontext, nástroje, oprávnění, stav a pravidla běhu.") @langchain-harness. Model navrhuje další krok, zatímco agentní vrstva jej převádí na akci a vrací výsledek zpět do dalšího kroku. Rozvrstvení shrnuje @fig-harness-layers.

#figure(
  image("/components/img/harness-layers.svg", width: 100%),
  caption: [Vrstvy agentického systému.],
) <fig-harness-layers>

#heading(level: 3)[Large Language Model (jazykový model)]

#term("Large Language Model", cs: "jazykový model", definition: "Model, který z kontextu odhaduje pravděpodobnosti následujících tokenů.") v agentovi vytváří další výstup podle aktuálního kontextu. Současné modely běžně používají architekturu #term("Transformer", definition: "Neuronová architektura založená na mechanismu pozornosti, která zpracovává vztahy mezi tokeny v kontextu.") představenou v roce 2017 @vaswani2017.

U #term("Attention", cs: "pozornost", definition: "Mechanismus, který při výpočtu reprezentace tokenu váží informace z dalších tokenů v kontextu.") je prakticky důležité, že každý token může využít informace z ostatních pozic. U standardní plné pozornosti proto rostou výpočetní náklady přibližně s druhou mocninou délky kontextu.

Model sám mezi jednotlivými voláními neudržuje pracovní stav a bez okolního systému nemá přístup k souborům, příkazům ani nástrojům. Při inferenci zpracuje aktuální kontext a vytváří výstupní tokeny. Trvalý stav, nástroje a oprávnění proto musí dodat okolní agentní vrstva.

U #term("Embedding", cs: "vektorová reprezentace", definition: "Číselný vektor, který zachycuje vlastnosti nebo význam objektu tak, aby podobné objekty ležely v prostoru blízko sebe.") lze sémantické vztahy ukázat geometricky. Známým příkladem je vztah mezi slovy král, královna, muž a žena @mikolov2013linguistic @fig-embedding-queen.

#figure(
  image("/components/img/vector-embedding-queen.svg", width: 100%),
  caption: [Sémantické vztahy ve vektorovém prostoru @mikolov2013linguistic.],
) <fig-embedding-queen>

#heading(level: 3)[Agentní smyčka]

#term("Agent Loop", cs: "agentní smyčka", definition: "Opakovaný cyklus, v němž model vyhodnotí stav, zvolí další akci, obdrží její výsledek a pokračuje.") může využívat vzor #term("ReAct", cs: "Reasoning and Acting", definition: "Vzor střídající uvažování modelu, akci nad prostředím a pozorování výsledku.") @yao2022.

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

#heading(level: 3)[Nástroje a rozšíření]

Zadání určuje, co má agent udělat, zatímco agentní vrstva určuje, co skutečně může provést @langchain-harness.

- #term("Tools", cs: "nástroje", definition: "Funkce zpřístupněné modelu pro práci s prostředím, například čtení souborů, vyhledávání nebo spouštění příkazů.") jsou přímým kanálem mezi modelem a prostředím @anthropic2024tooluse
- #term("Skills", cs: "dovednosti", definition: "Opakovaně použitelné balíčky instrukcí, skriptů a zdrojů pro určitý typ úlohy.") sjednocují opakovanou práci do znovu použitelných schopností @agentskills-spec
- #term("Hooks", cs: "háčky", definition: "Programové reakce na události životního cyklu, které mohou před akcí nebo po ní vynutit další krok.") přesouvají vybrané kontroly z úsudku modelu do programu @openai-agents-lifecycle
- #term("Model Context Protocol", cs: "protokol modelového kontextu", definition: "Standard klient–server pro připojování externích nástrojů a datových zdrojů k agentním systémům.") sjednocuje způsob, jakým se tyto externí schopnosti připojují @mcp-specification

Každá akce může být navíc řízena oprávněním, které ji povolí automaticky, vyžádá souhlas člověka nebo ji zakáže.

Projektové instrukce lze verzovat přímo s repozitářem. Soubor `AGENTS.md` poskytuje společné místo pro příkazy sestavení, testy a konvence @agents-md. Standard Agent Skills používá pro každou dovednost vstupní soubor `SKILL.md` @agentskills-spec.

#heading(level: 3)[Kontext]

Do #term("Context Window", cs: "kontextové okno", definition: "Množství vstupních a průběžných informací, které může model zpracovat v jednom běhu.") se v agentním běhu skládají instrukce, části repozitáře, historie nástrojů i výsledky předchozích kroků. Samotná velikost okna nezaručuje správné využití všech informací. Výkon modelů může klesat například tehdy, když se důležitá informace nachází uprostřed dlouhého vstupu @liu2024.

Riziko #term("Context Rot", cs: "degradace kontextu", definition: "Zhoršování schopnosti modelu využít relevantní informace s rostoucím nebo nekvalitním kontextem.") roste s délkou a množstvím méně relevantních informací @anthropic-context-engineering. #term("Compaction", cs: "kompakce", definition: "Nahrazení starší části průběhu kratším souhrnem důležitých rozhodnutí, výsledků a otevřených úkolů.") uvolňuje místo v kontextovém okně, ale zároveň může zahodit detail, který by byl později užitečný @anthropic-context-engineering.

Dlouhodobý autoritativní stav je proto vhodné uchovávat mimo samotný přepis konverzace a do pracovního kontextu v každém kroku vybírat jen aktuální informace potřebné pro danou úlohu.
