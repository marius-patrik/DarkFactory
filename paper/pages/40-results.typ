// Chapter 4 opener and 4.1 Findings.
#heading(level: 1)[Výsledky a diskuse] <results-section>


#heading(level: 2)[Zjištění] <results-first>

První zjištění se týká volby vývojového prostředí. Požadavek, jeho schválení, plán, zpětná vazba i výsledná revize zůstávají v GitHubu, takže jednotlivé běhy nemusí sdílet vlastní databázi ani trvalý proces. GitHub Actions přijme událost, připraví checkout a kontejner a následně spustí pythonovský runner. Runner předá práci harnessu a výsledek převede zpět do issue, větve nebo pull requestu @darkfactory-d576ec8f.

Druhé zjištění potvrzuje oddělení lidského rozhodnutí od modelového návrhu. Issue nejprve vyvolá interpretaci, následně plán a teprve po schválení obou kroků se vytvoří pracovní větev a spustí implementace. Tím pipeline nevytváří změny v hlavní větvi pouze na základě samotného návrhu agenta @darkfactory-d576ec8f.

Třetí zjištění se týká průběhu revize. Implementace je nejprve odevzdána jako draft pull request. Automatická kontrola nejprve porovná změněné soubory se schváleným plánem a poté předá diff modelové review. Nalezené problémy spouštějí samostatný běh opravy, po němž následuje nová kontrola. Teprve čistá review a kontrola souladu s plánem otevřou pull request pro lidskou revizi @darkfactory-d576ec8f.

Čtvrté zjištění se týká zpětné vazby a integrace. Změnový požadavek na pull requestu spouští opravu na stejné větvi a po pushi znovu vstupuje do review smyčky. Schválení pull requestu naopak spouští merge s odstraněním větve. Pipeline tedy nekončí automatickým vytvořením kódu, ale přechází do explicitního lidského schválení a následné integrace @darkfactory-d576ec8f.
