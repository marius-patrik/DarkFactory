/**
 * Classifying a Request into the type and area labels the board routes on.
 *
 * The type vocabulary is fixed, because it is the Conventional Commit vocabulary: a label that is
 * not a commit type produces a commit the repository's own rules reject. The area vocabulary is
 * *not* fixed - it is a property of the repository, read from its own declaration - so the
 * taxonomy is supplied rather than hard-coded. A repository adopting the pipeline declares its own
 * areas and gets its own routing, and one that declares none still gets a label rather than an
 * unlabelable issue.
 *
 * Keyword fallback is used only when the issue form did not declare a type, and the bug fallback is
 * limited to explicit defect wording, so an ordinary mention of failures or error handling does
 * not become `bug`.
 */

/** The type labels the classifier may emit. Each is also a Conventional Commit type. */
export const TYPE_LABELS = ["feat", "bug", "chore", "refactor", "test", "ci", "docs"] as const;

/** A type label the classifier may emit. */
export type TypeLabel = (typeof TYPE_LABELS)[number];

/** The area taxonomy a repository declares, in match order. */
export interface AreaTaxonomy {
	/** The area an unmatched request falls to. */
	defaultArea: string;
	/** Keywords per area, keyed by area name. Declaration order is match order. */
	areaKeywords: Readonly<Record<string, readonly string[]>>;
}

/** The `### Request Type` section of an issue form, and the value under it. */
const DECLARED_TYPE_RE = /###\s*Request Type\s*\n+\s*([a-z]+)(?:\s|\(|$)/iu;

/** Defect wording, which is the only thing that makes a request a `bug` by keyword. */
const BUG_KEYWORDS_RE = /\b(?:bug|regression|crash|broken)\b/iu;

/** Documentation wording, checked after bug so "document the crash" is a docs change. */
const DOCS_KEYWORDS_RE =
	/\b(?:docs?|document|documents|documenting|documentation|docstrings?|tsdoc|typedoc|readme)\b/iu;

/** Refactoring wording. */
const REFACTOR_KEYWORDS_RE = /\b(?:refactor|clean|cleanup|simplify)\b/iu;

/** Testing wording. */
const TEST_KEYWORDS_RE = /\b(?:test|pytest|testing|mock)\b/iu;

/** Continuous-integration wording. */
const CI_KEYWORDS_RE = /\b(?:ci|workflow|action|docker|runner)\b/iu;

/** Dependency-bump wording. */
const CHORE_KEYWORDS_RE = /\b(?:chore|dependency|deps|bump)\b/iu;

/** Escape a keyword for use inside a word-boundary alternation. */
function escapeLiteral(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

/**
 * The `area:` label for a request, from the repository's own taxonomy.
 *
 * Declaration order is match order, so a repository puts its most specific areas first and the
 * first hit wins. An area with no keywords is skipped rather than matched against an empty
 * alternation, which would match every position.
 *
 * @param text - Title and body text to inspect.
 * @param taxonomy - The repository's area taxonomy.
 * @returns The area label, prefixed with `area:`.
 */
export function classifyArea(text: string, taxonomy: AreaTaxonomy): string {
	const lower = text.toLowerCase();
	for (const [area, keywords] of Object.entries(taxonomy.areaKeywords)) {
		if (!keywords || keywords.length === 0) continue;
		const pattern = new RegExp(`\\b(?:${keywords.map(escapeLiteral).join("|")})\\b`, "iu");
		if (pattern.test(lower)) return `area:${area}`;
	}
	return `area:${taxonomy.defaultArea}`;
}

/**
 * The type label for a request.
 *
 * The issue form's `### Request Type` declaration wins when it names a known type. Otherwise the
 * text decides, in a fixed order so the same words always produce the same label.
 *
 * @param text - Title and body text to inspect.
 * @returns The type label.
 */
export function classifyType(text: string): TypeLabel {
	const declared = DECLARED_TYPE_RE.exec(text);
	const declaredType = declared?.[1]?.toLowerCase();
	if (declaredType && (TYPE_LABELS as readonly string[]).includes(declaredType)) {
		return declaredType as TypeLabel;
	}
	const lower = text.toLowerCase();
	if (BUG_KEYWORDS_RE.test(lower)) return "bug";
	if (DOCS_KEYWORDS_RE.test(lower)) return "docs";
	if (REFACTOR_KEYWORDS_RE.test(lower)) return "refactor";
	if (TEST_KEYWORDS_RE.test(lower)) return "test";
	if (CI_KEYWORDS_RE.test(lower)) return "ci";
	if (CHORE_KEYWORDS_RE.test(lower)) return "chore";
	return "feat";
}

/** A request's classification. */
interface Classification {
	/** The type label, which is also the commit type. */
	type: TypeLabel;
	/** The area label, prefixed with `area:`. */
	area: string;
}

/**
 * Classify a Request into the labels intake applies.
 *
 * @param text - Title and body text to inspect.
 * @param taxonomy - The repository's area taxonomy.
 * @returns The type and area labels.
 */
export function classifyTypeAndArea(text: string, taxonomy: AreaTaxonomy): Classification {
	return { type: classifyType(text), area: classifyArea(text, taxonomy) };
}

/**
 * The `area:` labels a taxonomy produces, in declaration order.
 *
 * @param taxonomy - The repository's area taxonomy.
 * @returns The area labels, including the default area.
 */
export function areaLabels(taxonomy: AreaTaxonomy): string[] {
	return [
		...new Set([`area:${taxonomy.defaultArea}`, ...Object.keys(taxonomy.areaKeywords).map((area) => `area:${area}`)]),
	];
}
