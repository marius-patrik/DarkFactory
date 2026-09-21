#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "evaluation_limitations",
  czech: "Omezení evaluace",
  english: "Evaluation Limitations",
  definition: terms => [
Omezení evaluace určují, která tvrzení nelze ze zvoleného snapshotu spolehlivě odvodit.
  ],
  description: terms => [
Ve snapshotu zůstávají otevřené klíčové Requesty 317 (pravdivé aktualizace větví), 329 (natural-stop/result capture), 358 (graph-native orchestration), 359 (dokončení produkčního #raw("df") enginu), 360 (finální podporované vydání) a 361 (akceptace napříč šesti cílovými repozitáři). Otevřený zůstává i původní zastřešující Request 68.

Z toho vyplývají dvě omezení. Zaprvé, úspěšné CI a dílčí agentní běhy nejsou důkazem, že celý koncový Request → plánování → implementace → verifikace → review/fix → merge/reconciliation životní cyklus funguje ve finálním enginu bez pomocných cest. Zadruhé, tato práce neobsahuje statistický benchmark úspěšnosti agentů, ceny, latence, četnosti zacyklení ani degradace kontextu na reprezentativním souboru úloh. Taková měření by vyžadovala stabilní finální vydání a kontrolovaný experiment.

Výsledky proto mají charakter architektonické a implementační validace. Nejsou tvrzením o dokončené produkční připravenosti ani o obecně platné výkonnostní převaze DarkFactory nad jinými agentními systémy.
  ],
  relations: ((type: "dependency", target: "research_question_evaluation"),),
)
