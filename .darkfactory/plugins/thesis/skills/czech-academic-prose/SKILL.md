---
name: czech-academic-prose
description: Use when writing, editing or judging any Czech text of the thesis, including terminology, captions, and the annotation.
license: MIT
---

# Česká odborná próza

Tato dovednost je napsaná česky schválně. Agent, který ji čte, má pak pracovat česky: přemýšlet,
navrhovat i komentovat v češtině. Text práce je česky a nástroj, který ho má psát, má používat
stejný jazyk.

## Jedno pravidě, které ostatní vysvětluje

> Každá věta má být srozumitelná komukoli, kdo ji čte, a má tam být proto, že **něco znamená**.
> Slovo, které je jen na okrasu, tam není.

Z toho vyplývá vše ostatní. Latinismus je podezřelý, dlouhá věta je podezřelá, formulace, která
opakuje sousední odstavec jinými slovy, je špatná. Když si nejsi jistý, zda je věta potřebná,
zjisti, co vyřazuje. Pokud nevylučuje nic, smazat ji.

## Co dělat

- **Každou větu řeknout jednou, na jednom místě, nejsprostě.** Věta, která bude v následujícím
  odstavci zopakována jinými slovy, je chyba. Nejde o stručnost, jde o to, že práce pak tvrdí
  něco dvakrát a čtenář to podruhé nečte.
- **Řezat.** Když je sekce dlouhá, sečíst její části. Není stanovená žádná minimální délka
  sekce ani kapitoly. Správná délka je ta, v níž je řečeno vše, co sekce říci má, a nic dalšího.
  Stránky ani počet slov nejsou mírou kvality; mírou je, zda všechno důležité je řečeno a nic
  zbytečného není.
- **Běžné slovo místo latinského.** `navrchuje` → `navrhuje se`, `provedení` → `provedení` tam,
  kde stačí `vykonání`. Konkrétní sloveso místo řetězce podstatných jmen.
- **Přesné české slovo.** `dělenba` → `dělba`, `nutál` → `nutil`. Má-li být věta odborná, musí být
  i správná, jinak jen zní odborně.
- **Krátké věty.** Měřítko, které autor uznával: průměr věty pod 14 slov, žádná věta nad 30.
- **České uvozovky `„…“`** i uvnitř anglického názvu: `jejich nyní proslulé práci „Attention is all
  you need“`.
- **Slovo odpovídalo okolnímu textu.** Nově formulovaná věta musí sedět do odstavce, do kterého
  se vkládá, ne jen být gramaticky správná sama o sobě.
- **Nepřehánět.** Čísla přiřazovat tomu, kdo je změřil, a říct, když jde o vlastní hlášení.

## Co nedělat

- **Nepsat o práci uvnitř práce.** Odstavec, který mluví o tom, jak je práce uspořádaná, patří do
  úvodu a jinde ne. Odmítnuto bylo například: *„Úvod kvalifikuje zdroje jednou za celou práci; zde
  stojí pravidlo, podle něhož se ta kvalifikace řídí.“* Totéž *„Úvod ponechává tuto otázku
  otevřenou a metodická část ji přebírá“*. Oba odstavce mluví o dokumentu místo o předmětu.
- **Nepoužívat řetězec středníků bez sloves.** Výčet zdrojů nebo kroků, kde chybí určité sloveso,
  nenese obsah.
- **Nepoužívat dvě slova se stejným kořenem vedle sebe.** *navazuje navazující práce* →
  *práce následující*.
- **Nedělat z čárky tečku.** Mezi dvěma nezávislými větami patří tečka, ne čárka.
- **Nepopsávat obrázek slovy, která neodpovídají tomu, co obrázek ukazuje.** Věta o tom, že model
  zpracovává celý kontext najednou, popisovala něco jiného, než dělala pozornost. Totéž tvrzení, že
  se poprvé změnila věta, kdo jedná, když sekce mluví o jiné sekvenci kroků.
- **Nepoužívat `deterministické` pro cokoliv, co je volání modelu.** Taková kontrola je
  `kontrola dotazem na model`, tedy stejně pravděpodobná jako to, co posuzuje.
- **Nepředstírat, že zdroj něco dokládá, ani že nedokládá.** Ani že citace dokladuje pojem, ani že
  závěr práce je vlastní přínos, ani že nikdo nic nevydal.

## Slova

- Anglické `agent` se překládá jako české **agentní**: agent, agentní krok, agentní smyčka,
  `Agent Loop` → agentní smyčka. Podstatné jméno `agent` se nepřekládá, protože označuje toho, kdo
  jedná, a přípona `-ic` znamená *mající schopnost jednat*, ne jednajícího.
- Anglické `agentic` se překládá jako české **agentické**: agentický systém, agentické
  inženýrství.
- Ostatní anglické termíny zůstávají anglické, protože jsou oborové, a §1.3 to říká výslovně.
  Nepřekládat je jen proto, že by to znělo jednotněji.
- **Neplepat dvě jazyky v jednom souboru.** Jednou se to vyskytlo jako *Pythonovský* a *pythonovský*,
  jindy *Prompt Engineering* a *Prompt engineering* v téže větě. V rámci souboru platí jedna
  podoba.

## Měření

Počet znaků na sekci je užitečnější než odhad délky. Při pročištění klesl objem z přibližně 90 tisíc
znaků na méně než 18 tisíc, aniž by ubyla věta, která něco tvrdí. Klesne-li počet znaků a přibylo
věcí, které v textu nejsou, pak je úprava špatná.

## Co tato dovednost neřeší

Gramatiku a pravopis kontroluje jiný průchod. Tady jde o to, **co** se píše; jinde se zkontroluje, že
je to napsané správně. A `no-slop-review` z téhož pluginu rozhoduje, které z těchto bodů je
v konkrétním odstavci skutečně porušeno — tato dovednost popisuje míru, ne právo na hromadnou
opravu.
