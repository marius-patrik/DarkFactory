// 3.5 Implementation with coding agents.
#heading(level: 2)[Implementace pomocí coding agentů] <darkfactory-bootstrap>

DarkFactory není pouze systém určený pro práci coding agentů; coding agenti byli použiti i při jeho samotném
vývoji. Člověk určoval záměr, omezení a zásadní rozhodnutí, zatímco otevřená implementační práce byla
delegována komerčním coding agentům. Praktická část tak nepopisuje agentické inženýrství pouze zvenčí, ale
používá stejné postupy i při vzniku zkoumaného artefaktu.

Počáteční rozsah byl záměrně omezen na nejmenší uzavřený proces, který dokáže přijmout požadavek, předat
inženýrskou práci agentovi a vrátit výsledek do řízeného GitHub workflow. Cílem nebylo předem ručně vytvořit
rozsáhlou finální platformu, ale dostat první funkční podobu do rozsahu jednoho souvislého agentního běhu.
Tím se zkracuje cesta k bodu, ve kterém už systém může být použit pro vlastní další vývoj.

Právě tento okamžik tvoří bootstrap DarkFactory. Před vznikem základní pipeline musel člověk coding agenta
spouštět a řídit přímo. Jakmile však pipeline dokáže sama reagovat na požadavky, spouštět produkční harness,
uchovávat stav práce, vytvářet pracovní větev a vracet změnu k revizi, může být stejný proces použit i na
repozitář DarkFactory samotný @darkfactory-d576ec8f. Další funkce proto nemusí vznikat mimo systém, který mají
rozšiřovat; mohou být přidávány postupně prostřednictvím stejné pipeline.

Tento postup propojuje principy z teoretické části do jednoho praktického vývojového procesu: specifikace
vymezuje záměr, orchestrace řídí pořadí kroků, harness poskytuje agentní schopnosti, deterministické kontroly
ověřují to, co lze ověřit programově, a člověk zůstává v rozhodovacích bodech procesu. Způsob vzniku
DarkFactory sám o sobě nedokazuje vyšší kvalitu nebo spolehlivost agentem vytvořeného softwaru; ukazuje však,
že stejný agentický workflow lze použít nejen jako předmět návrhu, ale také jako prostředek k jeho dalšímu
rozšiřování.
