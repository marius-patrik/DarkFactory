// Chapter 5: conclusion.
#heading(level: 1)[Závěr]

Cílem práce bylo popsat a systematizovat principy současného agentického inženýrství ve vývoji
softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi. Tento cíl byl
naplněn propojením teoretického popisu současných agentických systémů s inženýrskou případovou
studií konkrétní GitHub-native softwarové továrny.

Teoretická část ukázala, že jazykový model je v agentickém vývoji pouze jednou součástí širšího
systému. Praktické použití coding agentů stojí také na harnessu, práci s kontextem a nástroji,
trvalém stavu, specifikaci cíle, orchestraci jednotlivých kroků a na rozlišení toho, co rozhoduje
model, co může být provedeno programově a kde má rozhodnout člověk. Tyto prvky se v současných
systémech objevují v různých podobách, ale dohromady tvoří opakující se vzor agentického
softwarového vývoje.

DarkFactory tento vzor realizuje pomocí běžných komponent softwarového vývoje. GitHub slouží jako
uživatelské rozhraní i trvalá stavová vrstva, GitHub Actions jako událostní a výpočetní prostředí,
Docker jako izolace agentního běhu a produkční coding-agent harness jako vykonávací vrstva pro
modelovou práci. Požadavek prochází interpretací a plánováním, následně implementací na pracovní
větvi, automatickou revizí a kontrolou souladu s plánem a nakonec lidským přijetím výsledného pull
requestu. Dokumentace se přitom generuje z kanonických zdrojů repozitáře a propojuje konkrétní
implementaci s člověkem, který systém řídí a reviduje.

Případová studie zároveň ukázala, že samotné spojení těchto částí nezaručuje správnost každého
výsledku. Modelová review zůstává modelovým úsudkem, některé kontrolní kroky počáteční implementace
nejsou ještě prosazeny jako tvrdé brány a změna rozsahu může ve zkoumané revizi pokračovat bez
obnoveného lidského schválení. Závěry práce jsou proto omezeny na konkrétní architektonické a
procesní principy pozorované v jednom systému, nikoli na obecné tvrzení o úspěšnosti coding agentů
nebo jednotlivých modelů.

Význam DarkFactory spočívá také ve způsobu jejího vzniku. První verze byla záměrně navržena jako
malý bootstrap, který bylo možné vytvořit pomocí komerčních coding agentů a který už následně
dokáže stejné nástroje sám spouštět a řídit. Agentické inženýrství se tím v tomto případě neposouvá
jen k automatizaci jednotlivého programátorského úkolu, ale k návrhu celého procesu, v němž lze
opakovaně delegovat otevřenou inženýrskou práci a současně zachovat stav, kontrolu a lidské
rozhodování.

Další rozvoj může navázat přímo na omezení popsaná v diskusi: zpřesnit deterministické brány,
vyžadovat nové schválení při změně rozsahu a ověřit stejné principy na dalších repozitářích a s
jinými harnessy. Práce tak uzavírá konkrétní případ DarkFactory, ale zároveň ukazuje širší posun ve
vývoji softwaru: s rostoucími schopnostmi coding agentů se část práce vývojáře přesouvá od
provádění jednotlivých kroků k návrhu systému, který určuje, co agent ví, co smí udělat, jak se
ověří jeho výstup a kdy musí rozhodnout člověk.
