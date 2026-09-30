// 4.2 Summary.
//
// STUBBED pending this rewrite.
//
// The guide's kap. 2.6 requires two things and this subsection keeps only those:
//   1. Whether the goal was met, stated plainly.
//   2. Recommendations for further research.
// Nothing else. The theory recap is chapter 2's, the answer to the research
// question is 4.1's, and the practical rule belongs to the author as a finding, not
// to the summary. Do not restore the three-principles answer
// (deleted by author, R15 / 1615ddf0).
#heading(level: 2)[Shrnutí]

Cíl práce byl ověřit, za jakých podmínek agentický systém spolehlivě vykonává inženýrskou práci. Cíl
byl dosažen a hypotéza se potvrdila. V praktické části byla implementována produkční pipeline, v níž
události GitHubu spouštějí agentní kroky v izolovaném kontejneru. Popsaná konfigurace DarkFactory
poskytuje odpověď, kterou lze přečíst přímo z pořadí kroků. Vykonaná práce musí být zapsaná mimo
konverzaci, aby na ni bylo možné se podívat bez agenta. Dvě rozhodnutí před vznikem větve musí patřit
člověku, aby je bylo možné odmítnout. Praktická autonomie je v tomto systému vlastností návrhu, který
práci řídí, a nikoli vlastností modelu, který v něm pracuje.

Pro další výzkum plyne čtyř doporučení.

Předně ověřit, zda podmínky platí i mimo popsanou konfiguraci — na jiném repozitáři, při jiné sadě
harnessů a při jiné sadě modelů. Dnešní odpověď je sázena na jednu revizi a na jeden repozitář;
přenos na jiný systém z popisu neplyne.

Dále prozkoumat, zda lze dosáhnout toho, aby plán byl hranicí, tak že se změna rozsahu vrátí k
lidskému schválení. Dnes se změna zapíše jako odůvodněná odchylka a k bráně se běh nevrátí.

Dále opřít poslední bránu o oprávnění v repozitáři, ne o porovnání s jedním účtem, aby záznam o
schválení odpovídal tomu, kdo skutečně rozhodl. Dnes se aktér porovnává s vlastníkem repozitáře.

Nakonec posoudit architekturu znovu až za ní, až se posune z revize zde popsané, a zjistit, zda
podmínky vydrží její rozšíření.
