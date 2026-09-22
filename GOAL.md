# Goal

## Thesis destination

Produce a rigorous, coherent academic thesis about **DarkFactory and agentic software development**.

The finished paper should not feel like a catalogue of AI terminology or a record of how the repository evolved. It should read as one authored argument whose theory, practical contribution, evidence, and conclusions all exist for the same reason.

The paper should leave the reader with a clear understanding of:

- why increasingly capable language models change what can be delegated in software development;
- why model capability alone is insufficient for a controlled engineering process;
- what a harness contributes around model inference;
- how Agentic Engineering turns those runtime capabilities into a disciplined development method;
- how DarkFactory realizes those ideas as a concrete software system;
- what the implementation and evaluation evidence actually establish.

## Semantic path

The thesis should move naturally through this chain:

**capability → engineering gap → harness → Agentic Engineering → DarkFactory → evidence → conclusions**

### Capability

Begin with the relevant change in what language models can do.

The purpose is not to survey AI broadly, but to establish why software-development tasks can increasingly be delegated to model-driven systems.

### Engineering gap

Show the difference between producing plausible model output and carrying out a controlled software-engineering process.

This is the problem the thesis needs to solve.

### Harness

Introduce the harness as the runtime that turns isolated model inference into sustained interaction with state, tools, an environment, and control mechanisms.

The theory should explain only the mechanisms needed to understand the later system.

### Agentic Engineering

Develop Agentic Engineering as the engineering discipline for using those capabilities deliberately.

The emphasis belongs on specification, bounded work, context, controlled effects, verification, integration, recovery, and orchestration where those ideas materially contribute to the argument.

### DarkFactory

Make DarkFactory the concrete practical contribution.

Its architecture should be explained from implementation truth and in terms of the engineering problems it solves, rather than as a package inventory.

The practical chapter should make the relationship between the theoretical ideas and the implemented system visible without restating the theory.

### Evidence

Evaluate DarkFactory from reproducible evidence.

Separate:
- what is directly observed;
- what those observations support;
- what remains outside the evidence.

The research questions, results, discussion, and conclusion should all be traceable to that evidence.

### Conclusions

End by answering the actual research problem.

The conclusion should synthesize the contribution and evidence, state the strongest limitations, and make clear what has genuinely been demonstrated.

## Writing standard

The paper should be concise, technically precise, and easy to follow.

Every section should have a reason to exist in the argument.

Every paragraph should contribute through one or more of:
- explanation needed for what follows;
- evidence;
- interpretation;
- limitation;
- a substantive connection between ideas.

Prefer direct statements over document narration.

Introduce terminology in prose at the point where it is needed.

Explain concepts only to the depth required by the thesis.

Use sources to support the argument, not to determine the shape of the writing.

Prefer original research, specifications, and first-party technical documentation for factual and mechanistic claims.

Avoid repetition by establishing a mechanism or result once and relying on it later.

## Proportion

The paper should spend space according to importance to the thesis:

- enough model theory to understand the harness problem;
- enough harness theory to understand the runtime;
- enough Agentic Engineering to understand the methodology;
- substantial attention to DarkFactory as the original practical contribution;
- substantial attention to evidence and limitations.

Technical detail that does not help the reader understand DarkFactory, its engineering rationale, or its evaluation should not dominate the paper.

## Reader experience

A reader should be able to move from the opening problem to the final conclusion without needing to reconstruct the thesis argument themselves.

The relationship between chapters should be apparent from the reasoning, not from repeated statements about document structure.

Figures, tables, terminology, citations, and code excerpts should appear because they make the argument or evidence clearer.

The paper should feel consistent in voice and level of abstraction from beginning to end.

## Final standard

The final thesis is complete when it can be read independently as a polished academic work in which:

- the research problem is clear;
- the theoretical material is necessary and proportionate;
- DarkFactory is explained as the practical contribution;
- factual claims are sourced;
- implementation claims are tied to a pinned system revision;
- evaluation is reproducible;
- conclusions follow from evidence;
- limitations are explicit;
- formatting satisfies the school contract;
- no section exists merely because material happened to be available.

The repository, build system, evidence model, and publication tooling exist to support this paper.
