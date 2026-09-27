// Chapter 4 opener and 4.1 Findings.
//
// The third correction is here: the pipeline runs self-review first and plan alignment
// second, and the committed text had them the other way round. The findings keep their
// original shape — four of them, following the stages of the run — and a fifth is added,
// because the record contradicts three claims the description used to make and a survey
// that can only return positive findings reads as advocacy.
#heading(level: 1)[Výsledky a diskuse] <results-section>


#heading(level: 2)[Zjištění] <results-first>

První zjištění se týká volby vývojového prostředí. Požadavek, jeho schválení, plán, zpětná vazba i výsledná revize zůstávají v GitHubu, takže jednotlivé běhy nemusí sdílet vlastní databázi ani trvalý proces. GitHub Actions přijme událost, připraví pracovní kopii repozitáře a kontejner a následně spustí pythonovský runner. Runner předá práci harnessu a výsledek převede zpět do issue, větve nebo pull requestu. Je tu i silnější důklad, než je pouhé uložení záznamu: plán je samostatné issue propojené s původní žádostí, takže se k němu dá vrátit a porovnat ho s výsledným diffem na dvou artefaktech mimo konverzaci @darkfactory-d576ec8f.

Druhé zjištění potvrzuje oddělení lidského rozhodnutí od modelového návrhu. Issue nejprve vyvolá interpretaci, následně plán a teprve po schválení obou kroků se vytvoří pracovní větev a spustí implementace. Tím pipeline nevytváří změny v hlavní větvi pouze na základě samotného návrhu agenta @darkfactory-d576ec8f.

Třetí zjištění se týká průběhu revize a jeho pořadí. Implementace je nejprve odevzdána jako draft pull request. Automatická kontrola nejprve předá diff modelové review a teprve poté, jakmile je čisté, porovná změněné soubory se schváleným plánem. Nalezené problémy spouštějí samostatný běh opravy, po němž následuje nová kontrola. Teprve čistá review a kontrola souladu s plánem otevřou pull request pro lidskou revizi @darkfactory-d576ec8f.

Čtvrté zjištění se týká zpětné vazby a integrace. Změnový požadavek na pull requestu spouští opravu na stejné větvi a po pushi znovu vstupuje do review smyčky. Schválení pull requestu naopak spouští merge s odstraněním větve, takže pipeline nekončí automatickým vytvořením kódu, ale přechází do explicitního lidského schválení a následné integrace. Kdo schválení vykoná, je v této revizi jen dvojčlenný seznam účtů, a je-li ochrana větě stále žádající, může potřebné schválení doplnit workflow jménem jiného účtu @darkfactory-d576ec8f.

Páté zjištění je záporné a práce ho ponechává. Tři předpoklady, na nichž popis průběhu stál, v této revizi neplatí. Revize se po vyčerpání tří iterací zastaví bez zaznamenaného verdiktu, takže nerozliší průchod od zastavení; zablokovaný stav zde neznamená opakovaný nález, ale vyčerpanou kvótu; a testy se před sloučením nespouštějí znovou, takže změna, která neprošla, na pull request dorazí. Podmínka zastavení, která první z těchto mezer vyřešila, je v dokumentaci cílové smyčky popsána výslovně @openai-goals; její vyplnění je věcí následné práce, ale zjištění, že chybí, do výsledků patří @darkfactory-d576ec8f.
