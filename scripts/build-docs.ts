import * as fs from "node:fs";
import * as path from "node:path";

export interface RuleFrontmatter {
  id: string;
  title: string;
  status: string;
  applies_to: string[];
  activation: string;
  owners: string[];
  [key: string]: any;
}

export interface RuleRecord {
  filename: string;
  slug: string;
  frontmatter: RuleFrontmatter;
  content: string;
}

export interface AdrRecord {
  number: string;
  title: string;
  status: string;
  resolves: string;
  slug: string;
  filename: string;
  content: string;
}

export interface WorkflowRecord {
  filename: string;
  name: string;
  triggers: string[];
  jobs: string[];
}

export interface BuildDocsOptions {
  repoRoot?: string;
  stagingDir?: string;
  skipProperdocs?: boolean;
  keepStaging?: boolean;
  properdocsCommand?: string[];
}

const DF_REPO_PATH = path.join(".darkfactory", "repo.df");
const ROOT_REPO_PATH = "repo.df";

/**
 * Resolves repo.df using the hard-transition contract: .darkfactory/repo.df or root repo.df, never both.
 */
export function resolveManifestPath(repoRoot: string): string {
  const dfPath = path.join(repoRoot, DF_REPO_PATH);
  const rootPath = path.join(repoRoot, ROOT_REPO_PATH);

  const dfExists = fs.existsSync(dfPath);
  const rootExists = fs.existsSync(rootPath);

  if (dfExists && rootExists) {
    throw new Error(`Both ${dfPath} and ${rootPath} exist; only one is allowed.`);
  }
  if (dfExists) {
    return dfPath;
  }
  if (rootExists) {
    return rootPath;
  }

  return dfPath;
}

/**
 * Parses frontmatter from a markdown string using Bun.YAML.
 */
export function parseFrontmatter(content: string): { data: Record<string, any>; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { data: {}, body: content };
  }
  try {
    const parsed = Bun.YAML.parse(match[1]);
    return { data: (parsed && typeof parsed === "object" ? parsed : {}) as Record<string, any>, body: match[2] };
  } catch {
    return { data: {}, body: match[2] };
  }
}

/**
 * Rewrites relative markdown link targets so they resolve within the published documentation site.
 */
export function rewriteLinks(markdown: string, destPath: string): string {
  const depth = destPath.split("/").length - 1;
  const prefix = "../".repeat(depth);

  const linkRewrites: Record<string, string> = {
    "README.md": "index.md",
    "PRD.md": "prd.md",
    "PLAN.md": "plan.md",
    "AGENTS.md": "agents.md",
    "CONTRIBUTING.md": "agents.md",
    "CLAUDE.md": "agents.md",
    ".agents/notes/adr/README.md": "architecture/decisions/process.md",
    "_notes/adr/README.md": "architecture/decisions/process.md",
    "adr/README.md": "architecture/decisions/process.md",
    "adr/": "architecture/decisions/index.md",
    ".agents/notes/adr/": "architecture/decisions/index.md",
    "_notes/adr/": "architecture/decisions/index.md",
    ".agents/rules/": "rules/index.md",
    "_rules/": "rules/index.md",
    "rules/": "rules/index.md",
  };

  return markdown.replace(
    /\]\((?!https?:\/\/)(?<target>[^)\s#]+)(?<anchor>#[^)]*)?\)/g,
    (match, target, anchor) => {
      const normalized = target.replace(/^\.\//, "");
      let replacement = linkRewrites[normalized];

      if (!replacement) {
        const adrMatch = normalized.match(
          /^(?:(?:\.agents\/notes|_notes)\/)?adr\/(?<slug>[^/]+\.md)$/
        );
        if (adrMatch && adrMatch.groups?.slug) {
          replacement = `architecture/decisions/${adrMatch.groups.slug}`;
        }
      }

      if (!replacement) {
        const ruleMatch = normalized.match(
          /^(?:(?:\.agents\/rules|_rules)\/|rules\/)(?<slug>[^/]+\.md)$/
        );
        if (ruleMatch && ruleMatch.groups?.slug) {
          replacement = `rules/${ruleMatch.groups.slug}`;
        }
      }

      if (!replacement) {
        return match;
      }

      return `](${prefix}${replacement}${anchor || ""})`;
    }
  );
}

/**
 * Discovers rule markdown files under .agents/rules/.
 */
export function discoverRules(repoRoot: string): RuleRecord[] {
  const rulesDir = path.join(repoRoot, ".agents", "rules");
  if (!fs.existsSync(rulesDir)) {
    return [];
  }

  const files = fs.readdirSync(rulesDir).sort();
  const records: RuleRecord[] = [];

  for (const filename of files) {
    if (!filename.endsWith(".md") || filename === "README.md" || filename === "index.md") {
      continue;
    }
    const fullPath = path.join(rulesDir, filename);
    const content = fs.readFileSync(fullPath, "utf-8");
    const { data } = parseFrontmatter(content);

    const slug = filename.replace(/\.md$/, "");
    const frontmatter: RuleFrontmatter = {
      id: data.id || slug,
      title: data.title || slug,
      status: data.status || "normative",
      applies_to: Array.isArray(data.applies_to) ? data.applies_to : [],
      activation: data.activation || "always",
      owners: Array.isArray(data.owners) ? data.owners : [],
      ...data,
    };

    records.push({
      filename,
      slug,
      frontmatter,
      content,
    });
  }

  return records;
}

/**
 * Generates the rule index table page.
 */
export function generateRuleIndex(rules: RuleRecord[]): string {
  const lines: string[] = [
    "# Operational and governance rules",
    "",
    "Every rule governing autonomous agent and contributor behavior. This index is generated",
    "from the front matter of `.agents/rules/*.md` at build time.",
    "",
  ];

  if (rules.length === 0) {
    return lines.concat(["*No rules recorded yet.*", ""]).join("\n");
  }

  lines.push("| ID | Rule | Status | Applies To | Activation | Owners |");
  lines.push("|---|---|---|---|---|---|");

  for (const rule of rules) {
    const fm = rule.frontmatter;
    const applies = fm.applies_to.join(", ") || "—";
    const owners = fm.owners.join(", ") || "—";
    lines.push(
      `| [${fm.id}](${rule.filename}) | [${fm.title}](${rule.filename}) | ${fm.status} | ${applies} | ${fm.activation} | ${owners} |`
    );
  }

  const normative = rules.filter((r) => r.frontmatter.status.toLowerCase().includes("normative")).length;
  lines.push("", `${rules.length} rules — ${normative} normative.`, "");

  return lines.join("\n");
}

const TITLE_PATTERN = /^#\s+ADR-(?<number>\d{4})\s+—\s+(?<title>.+?)\s*$/m;
const STATUS_PATTERN = /\*\*Status\*\*:\s*(?<status>[^·\n*]+)/;
const RESOLVES_PATTERN = /\*\*(?:Resolves|Narrows)\*\*:\s*(?<resolves>[^·\n]+)/;

/**
 * Discovers ADR files under .agents/notes/adr/.
 */
export function discoverAdrs(repoRoot: string): AdrRecord[] {
  const adrDir = path.join(repoRoot, ".agents", "notes", "adr");
  if (!fs.existsSync(adrDir)) {
    return [];
  }

  const files = fs.readdirSync(adrDir).sort();
  const records: AdrRecord[] = [];

  for (const filename of files) {
    if (!filename.endsWith(".md") || filename === "README.md" || filename === "index.md") {
      continue;
    }
    const fullPath = path.join(adrDir, filename);
    const content = fs.readFileSync(fullPath, "utf-8");

    const titleMatch = content.match(TITLE_PATTERN);
    if (!titleMatch || !titleMatch.groups) {
      throw new Error(
        `.agents/notes/adr/${filename} has no '# ADR-NNNN — Title' heading; the generated index cannot be built from it.`
      );
    }

    const statusMatch = content.match(STATUS_PATTERN);
    const resolvesMatch = content.match(RESOLVES_PATTERN);
    const slug = filename.replace(/\.md$/, "");

    records.push({
      number: titleMatch.groups.number,
      title: titleMatch.groups.title,
      status: statusMatch ? statusMatch.groups?.status?.trim() || "Unknown" : "Unknown",
      resolves: resolvesMatch ? resolvesMatch.groups?.resolves?.trim() || "" : "",
      slug,
      filename,
      content,
    });
  }

  return records.sort((a, b) => a.number.localeCompare(b.number));
}

/**
 * Generates the ADR index table page matching the decision process schema.
 */
export function generateAdrIndex(adrs: AdrRecord[]): string {
  const lines: string[] = [
    "# Architecture decisions",
    "",
    "Every decision that binds the implementation, one record per page. This index is generated",
    "from the files in `.agents/notes/adr/` at build time - it is never hand-maintained",
    "(`.agents/rules/002-inline-docs-and-generated-documentation.md`).",
    "",
    "See [the process](process.md) for when an ADR is required and how to write one.",
    "",
  ];

  if (adrs.length === 0) {
    return lines.concat(["*No decisions recorded yet.*", ""]).join("\n");
  }

  lines.push("| # | Decision | Status | Resolves |");
  lines.push("|---|---|---|---|");

  for (const adr of adrs) {
    const resolves = adr.resolves || "—";
    lines.push(
      `| [${adr.number}](${adr.slug}.md) | [${adr.title}](${adr.slug}.md) | ${adr.status} | ${resolves} |`
    );
  }

  const accepted = adrs.filter((r) => r.status.toLowerCase().startsWith("accepted")).length;
  lines.push("", `${accepted} current accepted architecture decisions.`, "");

  return lines.join("\n");
}

/**
 * Generates tables for taxonomy, labels, projects, and installed repositories from repo.df.
 */
export function generateManifestReference(manifest: any): string {
  const lines: string[] = [
    "# Repository manifest reference",
    "",
    "Declarative configuration for DarkFactory pipelines, taxonomy, labels, and installed projects.",
    "Generated from repository manifest (`repo.df`) at build time.",
    "",
    "## Area taxonomy and labels",
    "",
    "Area labels match keywords in commit scopes, PR labels, and agent routing.",
    "",
    "| Area | Label | Description | Keywords |",
    "|---|---|---|---|",
  ];

  const areas = manifest.areas || {};
  for (const [areaName, areaData] of Object.entries<any>(areas)) {
    if (areaName.startsWith("$")) continue;
    const desc = areaData.description || "";
    const keywords = (areaData.keywords || []).join(", ");
    lines.push(`| ${areaName} | \`area:${areaName}\` | ${desc} | ${keywords} |`);
  }

  lines.push("", "## Projects", "", "Documentation sites offered in the switcher:", "");
  lines.push("| Project | URL |");
  lines.push("|---|---|");
  const docProjects = (manifest.documentation && manifest.documentation.projects) || [];
  for (const proj of docProjects) {
    lines.push(`| [${proj.name}](${proj.url}) | ${proj.url} |`);
  }

  lines.push("", "## Installed fleet", "", "Repositories with DarkFactory automation installed:", "");
  lines.push("| Repository | GitHub |");
  lines.push("|---|---|");
  const installed = (manifest.app && manifest.app.installed_on) || [];
  for (const repo of installed) {
    lines.push(`| ${repo} | [${repo}](https://github.com/${repo}) |`);
  }

  if (manifest.identity) {
    lines.push("", "## Identity", "", "| Property | Value |", "|---|---|");
    for (const [key, val] of Object.entries(manifest.identity)) {
      if (Array.isArray(val)) {
        lines.push(`| ${key} | ${val.join(", ")} |`);
      } else if (typeof val === "string" || typeof val === "number") {
        lines.push(`| ${key} | ${val} |`);
      }
    }
  }

  lines.push("");
  return lines.join("\n");
}

/**
 * Discovers GitHub Actions workflow files under .github/workflows/.
 */
export function discoverWorkflows(repoRoot: string): WorkflowRecord[] {
  const workflowsDir = path.join(repoRoot, ".github", "workflows");
  if (!fs.existsSync(workflowsDir)) {
    return [];
  }

  const files = fs.readdirSync(workflowsDir).sort();
  const records: WorkflowRecord[] = [];

  for (const filename of files) {
    if (!filename.endsWith(".yml") && !filename.endsWith(".yaml")) {
      continue;
    }
    const fullPath = path.join(workflowsDir, filename);
    const content = fs.readFileSync(fullPath, "utf-8");
    try {
      const parsed = Bun.YAML.parse(content) as Record<string, any>;
      if (!parsed) continue;

      const name = parsed.name || filename;
      const onRaw = parsed.on || parsed[true as any] || {};
      let triggers: string[] = [];

      if (Array.isArray(onRaw)) {
        triggers = onRaw.map(String);
      } else if (typeof onRaw === "object" && onRaw !== null) {
        triggers = Object.keys(onRaw);
      } else if (onRaw) {
        triggers = [String(onRaw)];
      }

      const jobsRaw = parsed.jobs || {};
      const jobs = typeof jobsRaw === "object" && jobsRaw !== null ? Object.keys(jobsRaw) : [];

      records.push({
        filename,
        name,
        triggers,
        jobs,
      });
    } catch {
      // Ignore unparseable files
    }
  }

  return records.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generates the workflows overview table.
 */
export function generateWorkflowTable(workflows: WorkflowRecord[]): string {
  const lines: string[] = [
    "# Workflow pipelines",
    "",
    "GitHub Actions automation workflows declared in `.github/workflows/`.",
    "",
    "| Workflow | Triggers | Jobs |",
    "|---|---|---|",
  ];

  for (const wf of workflows) {
    const triggers = wf.triggers.length > 0 ? wf.triggers.join(", ") : "—";
    const jobs = wf.jobs.length > 0 ? wf.jobs.join(", ") : "—";
    lines.push(`| ${wf.name} | ${triggers} | ${jobs} |`);
  }

  lines.push("", `${workflows.length} workflows configured.`, "");
  return lines.join("\n");
}

/**
 * Removes the staging directory recursively.
 */
export function cleanStaging(stagingDir: string): void {
  if (fs.existsSync(stagingDir)) {
    fs.rmSync(stagingDir, { recursive: true, force: true });
  }
}

/**
 * Stages all reference documentation into the transient staging directory.
 */
export function stageDocs(repoRoot: string, stagingDir: string): void {
  cleanStaging(stagingDir);
  fs.mkdirSync(stagingDir, { recursive: true });

  // 1. Root prose pages
  const rootPages: Array<[string, string]> = [
    ["README.md", "index.md"],
    ["PRD.md", "prd.md"],
    ["PLAN.md", "plan.md"],
    ["AGENTS.md", "agents.md"],
    [path.join(".agents", "notes", "adr", "README.md"), path.join("architecture", "decisions", "process.md")],
  ];

  for (const [source, dest] of rootPages) {
    const sourcePath = path.join(repoRoot, source);
    if (fs.existsSync(sourcePath)) {
      const destPath = path.join(stagingDir, dest);
      fs.mkdirSync(path.dirname(destPath), { recursive: true });
      const raw = fs.readFileSync(sourcePath, "utf-8");
      const normalizedDest = dest.replace(/\\/g, "/");
      fs.writeFileSync(destPath, rewriteLinks(raw, normalizedDest), "utf-8");
    }
  }

  // 2. Rules
  const rules = discoverRules(repoRoot);
  const rulesTargetDir = path.join(stagingDir, "rules");
  fs.mkdirSync(rulesTargetDir, { recursive: true });
  fs.writeFileSync(path.join(rulesTargetDir, "index.md"), generateRuleIndex(rules), "utf-8");

  for (const rule of rules) {
    const destPath = path.join(rulesTargetDir, rule.filename);
    const normalizedDest = `rules/${rule.filename}`;
    fs.writeFileSync(destPath, rewriteLinks(rule.content, normalizedDest), "utf-8");
  }

  // 3. ADRs
  const adrs = discoverAdrs(repoRoot);
  const adrTargetDir = path.join(stagingDir, "architecture", "decisions");
  fs.mkdirSync(adrTargetDir, { recursive: true });
  fs.writeFileSync(path.join(adrTargetDir, "index.md"), generateAdrIndex(adrs), "utf-8");

  for (const adr of adrs) {
    const destPath = path.join(adrTargetDir, adr.filename);
    const normalizedDest = `architecture/decisions/${adr.filename}`;
    fs.writeFileSync(destPath, rewriteLinks(adr.content, normalizedDest), "utf-8");
  }

  // 4. Manifest reference
  const manifestPath = resolveManifestPath(repoRoot);
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    const refTargetDir = path.join(stagingDir, "reference");
    fs.mkdirSync(refTargetDir, { recursive: true });
    fs.writeFileSync(path.join(refTargetDir, "manifest.md"), generateManifestReference(manifest), "utf-8");
  }

  // 5. Workflows reference
  const workflows = discoverWorkflows(repoRoot);
  const refTargetDir = path.join(stagingDir, "reference");
  fs.mkdirSync(refTargetDir, { recursive: true });
  fs.writeFileSync(path.join(refTargetDir, "workflows.md"), generateWorkflowTable(workflows), "utf-8");
}

let activeStagingDir: string | null = null;

function handleExit() {
  if (activeStagingDir) {
    cleanStaging(activeStagingDir);
    activeStagingDir = null;
  }
}

process.on("SIGINT", () => {
  handleExit();
  process.exit(130);
});

process.on("SIGTERM", () => {
  handleExit();
  process.exit(143);
});

process.on("exit", () => {
  handleExit();
});

/**
 * Builds documentation by staging sources, invoking properdocs build --strict,
 * and ensuring staging is deleted on completion or failure.
 */
export async function buildDocs(options: BuildDocsOptions = {}): Promise<void> {
  const repoRoot = options.repoRoot || process.cwd();
  const stagingDir = options.stagingDir || path.join(repoRoot, ".properdocs-source");

  activeStagingDir = stagingDir;

  try {
    stageDocs(repoRoot, stagingDir);

    if (!options.skipProperdocs) {
      const command = options.properdocsCommand || ["properdocs", "build", "--strict"];
      const proc = Bun.spawnSync(command, {
        cwd: repoRoot,
        stdout: "inherit",
        stderr: "inherit",
      });

      if (proc.exitCode !== 0) {
        throw new Error(`${command.join(" ")} failed with exit code ${proc.exitCode}`);
      }
    }
  } finally {
    if (!options.keepStaging) {
      cleanStaging(stagingDir);
      activeStagingDir = null;
    }
  }
}

if (import.meta.main) {
  try {
    await buildDocs();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}
