/** Reader-oriented guides are navigation projections, never alternative product authorities. */
export interface GuideSection {
	id: string;
	title: string;
	pages: readonly { slug: string; title: string }[];
}

/** Ordered guide registry; missing sources fail the strict docs compilation. */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
	{
		id: "introduction",
		title: "Introduction",
		pages: [
			{
				slug: "overview",
				title: "What DarkFactory is",
			},
		],
	},
	{
		id: "getting-started",
		title: "Getting started",
		pages: [
			{
				slug: "installation",
				title: "Installation and verification",
			},
			{
				slug: "first-request",
				title: "First repository and governed Request",
			},
		],
	},
	{
		id: "operator",
		title: "Operator guide",
		pages: [
			{
				slug: "lifecycle",
				title: "Requests, planning, approvals and review",
			},
			{
				slug: "recovery",
				title: "Failure handling, checkpoint and resume",
			},
		],
	},
	{
		id: "cli",
		title: "CLI and TUI",
		pages: [
			{
				slug: "commands",
				title: "CLI commands and interactive mode",
			},
		],
	},
	{
		id: "configuration",
		title: "Configuration",
		pages: [
			{
				slug: "repository",
				title: "Combined repository configuration",
			},
			{
				slug: "credentials",
				title: "Providers, quotas, secrets and models",
			},
		],
	},
	{
		id: "architecture",
		title: "Architecture",
		pages: [
			{
				slug: "system",
				title: "Package ownership, workflow graph and trust boundaries",
			},
		],
	},
	{
		id: "capabilities",
		title: "Capability development",
		pages: [
			{
				slug: "extensions",
				title: "Capability ABI, detection and adapters",
			},
		],
	},
	{
		id: "administration",
		title: "Administration",
		pages: [
			{
				slug: "github",
				title: "GitHub App, Projects and protection",
			},
			{
				slug: "fleet",
				title: "Consumer fleet and updates",
			},
		],
	},
	{
		id: "development",
		title: "Development",
		pages: [
			{
				slug: "contributing",
				title: "Contributor workflow and verification",
			},
			{
				slug: "site-build",
				title: "Unified site: build and Pages contract",
			},
		],
	},
	{
		id: "release",
		title: "Release engineering",
		pages: [
			{
				slug: "publishing",
				title: "SemVer, candidate, artifact and rollback",
			},
		],
	},
	{
		id: "reference",
		title: "Reference and troubleshooting",
		pages: [
			{
				slug: "contracts",
				title: "Source-backed references and issue map",
			},
		],
	},
	{
		id: "security",
		title: "Security",
		pages: [
			{
				slug: "boundaries",
				title: "Authentication, authorization and static security",
			},
		],
	},
] as const;

export function guidePath(section: string, slug: string): string {
	return `docs/guides/${section}/${slug}.md`;
}
