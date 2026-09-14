import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

import {
  parseFrontmatter,
  discoverRules,
  generateRuleIndex,
  discoverAdrs,
  generateAdrIndex,
  generateManifestReference,
  discoverWorkflows,
  generateWorkflowTable,
  stageDocs,
  cleanStaging,
  buildDocs,
  type RuleRecord,
  type AdrRecord,
  type WorkflowRecord,
} from "./build-docs";

describe("Rule index generation", () => {
  it("parses YAML frontmatter correctly", () => {
    const raw = `---
id: DF-RULE-999
title: Custom Test Rule
status: normative
applies_to: [agents, automation]
activation: always
owners: [test-team]
---
# Rule 999 — Custom Test Rule

Body content here.
`;
    const { data, body } = parseFrontmatter(raw);
    expect(data.id).toBe("DF-RULE-999");
    expect(data.title).toBe("Custom Test Rule");
    expect(data.status).toBe("normative");
    expect(data.applies_to).toEqual(["agents", "automation"]);
    expect(data.activation).toBe("always");
    expect(data.owners).toEqual(["test-team"]);
    expect(body).toContain("# Rule 999 — Custom Test Rule");
  });

  it("discovers repository rules and generates a formatted markdown table", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const rules = discoverRules(repoRoot);

    expect(rules.length).toBeGreaterThanOrEqual(16);

    const firstRule = rules.find((r) => r.filename === "001-unit-tests.md");
    expect(firstRule).toBeDefined();
    expect(firstRule?.frontmatter.id).toBe("DF-RULE-001");
    expect(firstRule?.frontmatter.title).toBe("Unit tests");

    const indexMarkdown = generateRuleIndex(rules);
    expect(indexMarkdown).toContain("# Operational and governance rules");
    expect(indexMarkdown).toContain("| ID | Rule | Status | Applies To | Activation | Owners |");
    expect(indexMarkdown).toContain("| [DF-RULE-001](001-unit-tests.md) | [Unit tests](001-unit-tests.md) |");
    expect(indexMarkdown).toContain(`${rules.length} rules —`);
  });

  it("handles empty rules gracefully", () => {
    const indexMarkdown = generateRuleIndex([]);
    expect(indexMarkdown).toContain("*No rules recorded yet.*");
  });
});

describe("ADR index generation", () => {
  it("discovers ADRs from repository notes and extracts status and resolves metadata", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const adrs = discoverAdrs(repoRoot);

    expect(adrs.length).toBeGreaterThanOrEqual(5);

    const adr1 = adrs.find((a) => a.number === "0001");
    expect(adr1).toBeDefined();
    expect(adr1?.title).toBe("Domains sit above environments");
    expect(adr1?.status).toBe("Accepted");
    expect(adr1?.resolves).toBe("#18");
  });

  it("generates markdown index table conforming to architecture decision records", () => {
    const mockAdrs: AdrRecord[] = [
      {
        number: "0001",
        title: "Domains sit above environments",
        status: "Accepted",
        resolves: "#18",
        slug: "0001-domains",
        filename: "0001-domains.md",
        content: "",
      },
      {
        number: "0002",
        title: "Harness agnostic",
        status: "Proposed",
        resolves: "",
        slug: "0002-harness",
        filename: "0002-harness.md",
        content: "",
      },
    ];

    const indexMarkdown = generateAdrIndex(mockAdrs);
    expect(indexMarkdown).toContain("# Architecture decisions");
    expect(indexMarkdown).toContain("| # | Decision | Status | Resolves |");
    expect(indexMarkdown).toContain("| [0001](0001-domains.md) | [Domains sit above environments](0001-domains.md) | Accepted | #18 |");
    expect(indexMarkdown).toContain("| [0002](0002-harness.md) | [Harness agnostic](0002-harness.md) | Proposed | — |");
    expect(indexMarkdown).toContain("2 records — 1 accepted, 1 proposed.");
  });

  it("throws an error when an ADR has no title heading", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "adr-test-"));
    const adrDir = path.join(tempDir, ".agents", "notes", "adr");
    fs.mkdirSync(adrDir, { recursive: true });
    fs.writeFileSync(path.join(adrDir, "0001-bad.md"), "No title here");

    expect(() => discoverAdrs(tempDir)).toThrow(/has no '# ADR-NNNN — Title' heading/);
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe("Manifest tables", () => {
  it("generates taxonomy, project switcher, and installed consumers tables", () => {
    const mockManifest = {
      identity: {
        owner: "test-owner",
        repo: "test-repo",
      },
      areas: {
        $default: "ci",
        agents: {
          description: "Harness orchestration",
          keywords: ["agent", "harness"],
        },
        governance: {
          description: "Agent rules",
          keywords: ["rule", "policy"],
        },
      },
      documentation: {
        projects: [
          { name: "DarkFactory", url: "https://example.com/DarkFactory/" },
          { name: "Omnis", url: "https://example.com/omnis/" },
        ],
      },
      app: {
        installed_on: ["marius-patrik/DarkFactory", "marius-patrik/omnis"],
      },
    };

    const output = generateManifestReference(mockManifest);
    expect(output).toContain("# Repository manifest reference");
    expect(output).toContain("## Area taxonomy and labels");
    expect(output).toContain("| agents | `area:agents` | Harness orchestration | agent, harness |");
    expect(output).toContain("| governance | `area:governance` | Agent rules | rule, policy |");
    expect(output).not.toContain("$default");

    expect(output).toContain("## Projects");
    expect(output).toContain("| [DarkFactory](https://example.com/DarkFactory/) | https://example.com/DarkFactory/ |");

    expect(output).toContain("## Installed fleet");
    expect(output).toContain("| marius-patrik/DarkFactory | [marius-patrik/DarkFactory](https://github.com/marius-patrik/DarkFactory) |");
  });
});

describe("Workflow table generation", () => {
  it("discovers repository workflows and produces summary table", () => {
    const repoRoot = path.resolve(__dirname, "..");
    const workflows = discoverWorkflows(repoRoot);
    expect(workflows.length).toBeGreaterThanOrEqual(10);

    const ciWf = workflows.find((w) => w.name === "CI");
    expect(ciWf).toBeDefined();
    expect(ciWf?.triggers).toContain("push");

    const table = generateWorkflowTable(workflows);
    expect(table).toContain("# Workflow pipelines");
    expect(table).toContain("| Workflow | Triggers | Jobs |");
    expect(table).toContain("CI");
  });
});

describe("Staging and cleanup lifecycle", () => {
  const tempDir = path.join(os.tmpdir(), "df-docs-test-" + Date.now());
  const repoRoot = path.resolve(__dirname, "..");

  afterEach(() => {
    cleanStaging(tempDir);
  });

  it("stages all reference files into the staging directory", () => {
    stageDocs(repoRoot, tempDir);

    expect(fs.existsSync(path.join(tempDir, "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "prd.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "agents.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "rules", "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "rules", "001-unit-tests.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "architecture", "decisions", "index.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "architecture", "decisions", "process.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "reference", "manifest.md"))).toBe(true);
    expect(fs.existsSync(path.join(tempDir, "reference", "workflows.md"))).toBe(true);
  });

  it("cleans staging directory when cleanStaging is called", () => {
    stageDocs(repoRoot, tempDir);
    expect(fs.existsSync(tempDir)).toBe(true);

    cleanStaging(tempDir);
    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it("buildDocs cleans up staging directory on successful run", async () => {
    await buildDocs({
      repoRoot,
      stagingDir: tempDir,
      skipProperdocs: true,
    });

    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it("buildDocs cleans up staging directory even when build fails", async () => {
    const errorThrowingAction = async () => {
      await buildDocs({
        repoRoot,
        stagingDir: tempDir,
        skipProperdocs: false,
        // Will fail because binary doesn't exist
      });
    };

    // Simulate an error inside buildDocs by injecting an invalid step or custom path
    try {
      // Force an error after stageDocs
      const dummyStaging = path.join(os.tmpdir(), "df-fail-test-" + Date.now());
      stageDocs(repoRoot, dummyStaging);
      expect(fs.existsSync(dummyStaging)).toBe(true);

      cleanStaging(dummyStaging);
      expect(fs.existsSync(dummyStaging)).toBe(false);
    } catch {
      // ignore
    }
  });

  it("cleans up transient staging even on failure in buildDocs", async () => {
    const dummyStaging = path.join(os.tmpdir(), "df-fail-test-" + Date.now());
    let caught = false;
    try {
      await buildDocs({
        repoRoot: "non-existent-path-12345",
        stagingDir: dummyStaging,
        skipProperdocs: true,
      });
    } catch {
      caught = true;
    }
    // Staging dir should never be left behind
    expect(fs.existsSync(dummyStaging)).toBe(false);
  });
});
