// ─────────────────────────────────────────────────────────────
//  Metadata práce.
// ─────────────────────────────────────────────────────────────

#import "lib/odborna-prace.typ": draft, added

#let meta = (
  nazev: "Úvod do agentického AI a harness pro automatizovaný softwarový vývoj",
  podnazev: none,

  autor: "Patrik Marius",
  trida: "4.D",
  vedouci: "Michal Dočekal",
  konzultant: none,

  skola: "Gymnázium J. K. Tyla",
  skola-zkratka: "GJKT",
  mesto: "Hradci Králové",
  rok: 2026,

  anotace: added[
    Tato odborná práce se zabývá principy agentního inženýrství (_agentic engineering_)
    a architekturou řídicích harnessů pro autonomní vývoj softwaru. Práce analyzuje
    fundamentální limity autoregresivních velkých jazykových modelů a představuje
    deterministické metody řízení jejich exekuce: formalizaci životního cyklu vývojových
    požadavků, bezpečnostní mantinely a detekci uvíznutí ve smyčce ReAct, správu
    kontextového okna a eliminaci sémantického posunu při kompresi historie, standardizované
    vyvolávání nástrojů a hierarchickou orchestraci subagentů. Cílem práce je formulovat
    ucelený architektonický rámec, který umožňuje spolehlivé a bezpečné zapojení
    autonomních agentů do reálného softwarového inženýrství pod deterministickým
    lidským dohledem.
  ],
  abstract: added[
    This thesis explores the foundational principles of agentic engineering and harness
    architecture for automated software development. The work analyzes the fundamental
    limitations of autoregressive large language models and presents deterministic execution
    control mechanisms: formalization of the engineering request lifecycle, runtime safety
    boundaries and stuck detection within the ReAct loop, context window management and
    semantic drift mitigation during compaction, standardized tool invocation, and
    hierarchical subagent orchestration. The objective is to formulate a robust architectural
    framework that enables reliable and secure integration of autonomous agents into
    real-world software engineering under deterministic human governance.
  ],

  klicova-slova: (
    "agentní inženýrství", "řídicí harness", "autonomní systémy",
    "softwarové inženýrství", "orchestrace agentů", "jazykové modely",
  ),
  keywords: (
    "agentic engineering", "harness architecture", "autonomous systems",
    "software engineering", "agent orchestration", "language models",
  ),

  podekovani: none,
)
