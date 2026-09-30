# STATE — DarkFactory thesis

Updated 2026-09-30 after the framing pass. This file describes the current manuscript and the remaining work. Superseded reliability/criteria framing has been removed; git history remains the record of prior versions.

## Identity

- Thesis: *Agentické inženýrství ve vývoji softwaru — Návrh a implementace DarkFactory*
- Author: Patrik Marius
- Supervisor: Michal Dočekal
- School: Gymnázium J. K. Tyla
- Year: 2026
- Source: Typst under `paper/`
- Branch: `docs/thesis`

## Current framing

The paper is an **engineering case study of contemporary agentic software-development practice**, not an experiment measuring model reliability.

### Motivation

Generative-AI capabilities and adoption continue to grow, while regular coding-agent use remains much narrower than ordinary chatbot use. The paper therefore asks what current agentic-engineering practices make possible when coding agents are placed inside a deliberately engineered process.

### Goal

> Cílem práce je popsat a systematizovat principy současného agentického inženýrství ve vývoji softwaru a na systému DarkFactory ukázat, co jejich propojení umožňuje v praxi.

### Research question

> Jaké architektonické a procesní principy se opakují v současném agentickém vývoji softwaru a jak jsou realizovány v systému DarkFactory?

There is **no formal reliability hypothesis** and no K1–K5 evaluation scheme.

### Software-factory framing

- The software-factory idea predates generative AI; §2.3 grounds the term in Bemer/NATO 1968.
- Coding agents extend automation into steps whose exact procedure is not fully hard-coded in advance.
- Stripe and Meta are used as primary-source examples that agentic repository/PR workflows are already used in production software engineering.
- DarkFactory is presented as a deliberately simple, GitHub-native **bootstrap implementation** of this broader pattern.

### Practical framing

- §3.1 names the method as an engineering case study.
- DarkFactory was implemented using commercial coding agents.
- The practical chapter describes how the system is built and how a request moves through it.
- The initial implementation is intentionally simple: it can already launch and manage coding agents and serves as a base that can be extended through the same pipeline.
- The study does not compare commercial agents or estimate general model success rates.

## Current structure

```
1 Úvod
  1.1 Motivace: Vývoj a adopce generativní AI
  1.2 Cíl, výzkumná otázka a vymezení
  1.3 Terminologie
2 Teoretická část
  2.1 Agent: Co to je a jak funguje
  2.2 Agentické inženýrství
  2.3 Softwareová továrna
3 Praktická část
  3.1 Metodika
  3.2 Architektura produkčního běhu
  3.3 Interpretace a plánování požadavku
  3.4 Implementace a automatická revize
  3.5 Zpětná vazba, schválení a úklid
4 Zjištění a diskuse
5 Závěr
```

Chapter 4 and Chapter 5 are intentionally stubbed until theory and the practical chapter are final.

## Applied framing decisions

- Czech annotation and English abstract match the case-study/software-factory framing.
- Keywords: coding agenti; harness; softwarová továrna; orchestrace; generativní AI.
- §1.2 no longer claims experimental verification of reliability.
- §2.2 defines agentic engineering operationally for this paper rather than as a universal taxonomy.
- §2.3 defines software factory, gives the historical origin, explains what coding agents change, and grounds present-day use in Stripe and Meta.
- §3.1 treats DarkFactory as a GitHub-native case implementation of that broader pattern.
- Chapter 4 is findings/discussion, not a scorecard.
- Chapter 5 is a standalone conclusion.

## Remaining work

1. **Theory precision pass**
   - check §2.1 for overstatements about ReAct, context, tools, and standards;
   - keep claims descriptive and source-supported;
   - ensure all figures are referenced in prose.

2. **Practical chapter**
   - rewrite/finish §3.2–§3.5 as the implementation case study;
   - keep the focus on concrete architecture, design decisions, and actual workflow;
   - avoid reintroducing scoring criteria or experimental language.

3. **Findings and discussion**
   - answer the research question from the completed theory + case;
   - identify what the DarkFactory case demonstrates;
   - state concrete limitations of the initial bootstrap implementation;
   - keep case-bounded findings distinct from broader industry observations.

4. **Conclusion**
   - confirm how the stated goal was fulfilled;
   - summarize only the major findings;
   - close with the bootstrap implication if still supported by the finished case.

5. **Final compliance pass**
   - citations and bibliography;
   - figure references/captions;
   - language and terminology consistency;
   - build and inspect final PDF against the GJKT guide.

## Do not reintroduce

- K1–K5 evaluation criteria;
- a general model-reliability experiment;
- a claim that DarkFactory proves the one correct architecture;
- an iteration cap that is not supported by the implementation;
- a separate formal “limitations” apparatus unless the finished discussion actually needs it.
