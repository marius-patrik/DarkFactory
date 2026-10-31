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
				title: "Operating a governed Request",
			},
			{
				slug: "recovery",
				title: "Recovery and incident handling",
			},
		],
	},
	{
		id: "cli",
		title: "CLI and TUI",
		pages: [
			{
				slug: "commands",
				title: "CLI and TUI",
			},
		],
	},
	{
		id: "configuration",
		title: "Configuration",
		pages: [
			{
				slug: "repository",
				title: "Combined configuration",
			},
			{
				slug: "credentials",
				title: "Credentials, models and quota",
			},
		],
	},
	{
		id: "architecture",
		title: "Architecture",
		pages: [
			{
				slug: "system",
				title: "System architecture",
			},
		],
	},
	{
		id: "capabilities",
		title: "Capability development",
		pages: [
			{
				slug: "extensions",
				title: "Developing capabilities",
			},
		],
	},
	{
		id: "administration",
		title: "Administration",
		pages: [
			{
				slug: "github",
				title: "GitHub administration",
			},
			{
				slug: "fleet",
				title: "Fleet scope and installation policy",
			},
		],
	},
	{
		id: "development",
		title: "Development",
		pages: [
			{
				slug: "contributing",
				title: "Contributing to DarkFactory",
			},
			{
				slug: "site-build",
				title: "Unified Web + Docs site contract",
			},
		],
	},
	{
		id: "release",
		title: "Release engineering",
		pages: [
			{
				slug: "publishing",
				title: "Candidate, publishing and rollback",
			},
		],
	},
	{
		id: "reference",
		title: "Reference and troubleshooting",
		pages: [
			{
				slug: "contracts",
				title: "Reference index",
			},
			{
				slug: "coverage",
				title: "Documentation coverage and acceptance",
			},
		],
	},
	{
		id: "security",
		title: "Security",
		pages: [
			{
				slug: "boundaries",
				title: "Security and authorization boundaries",
			},
		],
	},
] as const;

export function guidePath(section: string, slug: string): string {
	return `docs/guides/${section}/${slug}.md`;
}
