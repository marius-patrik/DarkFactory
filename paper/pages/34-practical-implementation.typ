// 3.4 End-to-end request flow.
//
// Purpose:
// - give one chronological walkthrough from user request to merged change;
// - combine the old planning, implementation/review and human-integration sections;
// - use the pipeline diagram here;
// - keep the flow readable at the level of engineering stages rather than implementation
//   minutiae.
//
// Intended flow:
// issue / request
// -> interpretation
// -> human approval
// -> implementation plan
// -> human approval
// -> branch + coding-agent implementation
// -> deterministic checks
// -> draft pull request
// -> review/fix loop
// -> human feedback / approval
// -> merge + cleanup.
//
// Concrete limitations or design weaknesses discovered in this flow belong in Chapter 4,
// not in the descriptive walkthrough unless needed to explain actual behavior.
#heading(level: 2)[Průchod požadavku systémem] <darkfactory-request-flow>
