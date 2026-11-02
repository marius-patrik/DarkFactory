#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";

const git = (...a) => execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const original = git("ls-files", "-z").split("\0").filter(Boolean);
const files = new Set(original);
const dirs = new Set(["."]);
for (const f of original) {const a=f.split("/");while(a.length>1){a.pop();dirs.add(a.join("/"));}}
const isTest = p => p.startsWith("tests/") || /(^|\/)(test|tests|__tests__|specs)\//.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/.test(p);
function relocated(p) {
 if (isTest(p)) {
   let q=p.replace(/^tests\//,"");
   if(q.startsWith(".darkfactory/plugins/"))q="plugins/"+q.slice(21);
   return ".github/tests/"+q;
 }
 if(p==="README.md")return ".agents/PRODUCT.md";
 if(p===".darkfactory/ADRs.md")return ".agents/ARCHITECTURE.md";
 if(p.startsWith(".darkfactory/plugins/"))p="plugins/"+p.slice(21);
 if(p.startsWith("plugins/harness/scripts/"))return ".github/scripts/"+p.slice("plugins/harness/scripts/".length);
 if(p.startsWith("plugins/thesis/scripts/"))return ".github/scripts/thesis/"+p.slice("plugins/thesis/scripts/".length);
 if(p.startsWith("scripts/"))return ".github/scripts/"+p.slice(8);
 return p;
}
const removed=new Set([".agents","ADRs.md","CONTRIBUTING.md"]);
const moves=original.filter(p=>!removed.has(p)&&relocated(p)!==p);
const dests=new Set();
for(const p of moves){const t=relocated(p);if(dests.has(t))throw Error("Destination collision "+t);dests.add(t);}
for(const p of removed)git("rm",p);
for(const p of moves){const t=relocated(p);mkdirSync(path.dirname(t),{recursive:true});git("mv",p,t);}
mkdirSync(".agents",{recursive:true});
writeFileSync(".agents/AGENTS.md", [
 "# DarkFactory — Agent and Contributor Instructions",
 "",
 "Canonical product requirements: [PRODUCT.md](PRODUCT.md).",
 "Accepted architecture and ADR decisions: [ARCHITECTURE.md](ARCHITECTURE.md).",
 "Executable configuration: [repo.dfconfig](../repo.dfconfig).",
 "",
 "Preserve functionality, trust boundaries, approvals, release-on-main automation, source-free",
 "packaging and durable execution guarantees through every migration. Do not mistake directory",
 "relocation for the separately planned DSH-native runtime convergence. Validate Bun tests,",
 "TypeScript, lint, formatting, documentation, installation and Nix before integration.",
 "Keep first-party plugins under root plugins/, automation under .github/scripts/,",
 "tests under .github/tests/. Leave the installation receipt at .darkfactory/installation.json",
 "until a separately verified successor replaces its provenance and drift guarantees.",
 ""
].join("\n"));
symlinkSync(".agents/PRODUCT.md","README.md");
symlinkSync(".agents/AGENTS.md","CONTRIBUTING.md");
git("add","README.md","CONTRIBUTING.md",".agents/AGENTS.md");

const norm=p=>path.posix.normalize(p);
const known=p=>files.has(p)||dirs.has(p)||files.has(p+".ts")||files.has(p.replace(/\.(js|mjs)$/,".ts"));
const dirMap=p=>{
 if(p===".")return ".";
 if(files.has(p))return relocated(p);
 const sample=original.find(f=>f.startsWith(p+"/"));
 if(!sample)return p;
 const depth=sample.split("/").length-p.split("/").length;
 return relocated(sample).split("/").slice(0,-depth).join("/")||".";
};
const rel=(from,to)=>{
 let p=path.posix.relative(path.posix.dirname(from),to);
 if(!p.startsWith("."))p="./"+p;
 return p;
};
const substitutions=[
 [".darkfactory/ADRs.md",".agents/ARCHITECTURE.md"],
 [".darkfactory/plugins/","plugins/"],
 ["plugins/harness/scripts/",".github/scripts/"],
 ["scripts/build-docs.ts",".github/scripts/build-docs.ts"],
 ["scripts/fleet-control.mjs",".github/scripts/fleet-control.mjs"],
 ["scripts/fleet-projects.mjs",".github/scripts/fleet-projects.mjs"],
 ["scripts/fleet-sync.mjs",".github/scripts/fleet-sync.mjs"],
 ["scripts/self-install-check.mjs",".github/scripts/self-install-check.mjs"],
 ["scripts/self-projects-rest.mjs",".github/scripts/self-projects-rest.mjs"],
 ["scripts/df-wrapper.sh",".github/scripts/df-wrapper.sh"],
 ["scripts/df-wrapper.cmd",".github/scripts/df-wrapper.cmd"]
];
let edited=0;
for(const old of original){
 if(removed.has(old))continue;
 const now=relocated(old);
 if(!existsSync(now)||lstatSync(now).isSymbolicLink()||!lstatSync(now).isFile())continue;
 if(!/\.(ts|tsx|js|mjs|cjs|json|yml|yaml|md|sh|nix|cmd)$/.test(now))continue;
 const b=readFileSync(now);if(b.includes(0))continue;
 const input=b.toString("utf8");if(!Buffer.from(input).equals(b))continue;
 let s=input;
 s=s.replace(/(["'\x60])(\.\.?\/[^"'\x60\r\n]+)\1/g,(full,q,spec)=>{
  const match=/^([^?#]+)(.*)$/.exec(spec);if(!match)return full;
  const abs=norm(path.posix.join(path.posix.dirname(old),match[1]));
  if(!known(abs))return full;
  const target=files.has(abs)?relocated(abs):files.has(abs+".ts")?relocated(abs+".ts").slice(0,-3):dirMap(abs);
  if(old===now&&abs===target)return full;
  return q+rel(now,target)+(match[1].endsWith("/")?"/":"")+match[2]+q;
 });
 for(const [from,to] of substitutions){
  const escaped=from.replace(/([\\^$.*+?()[\]{}|])/g,"\\$1");
  s=s.replace(new RegExp("(?<![\\w./])"+escaped,"g"),to);
 }
 s=s.replace(/(["'])\.darkfactory\1(\s*,\s*)(["'])plugins\3/g,(all,q)=>q+"plugins"+q);
 s=s.replace(/(["'])scripts\1(\s*,\s*)(["'])(df-wrapper\.cmd|df-wrapper\.sh|build-docs\.ts|fleet-control\.mjs|fleet-projects\.mjs|fleet-sync\.mjs|self-install-check\.mjs|self-projects-rest\.mjs)\3/g,(all,q,comma,z,name)=>q+".github"+q+comma+q+"scripts"+q+comma+z+name+z);
 if(s!==input){writeFileSync(now,s);edited++;}
}
const patch=(p,fn)=>{let s=readFileSync(p,"utf8");let v=fn(s);if(v!==s){writeFileSync(p,v);edited++}};
patch("package.json",s=>{const j=JSON.parse(s);j.scripts.test="bun .github/scripts/run-tests.ts";j.scripts.build="bun .github/scripts/build.ts";j.scripts["install:df"]="bun .github/scripts/install.ts";j.scripts.docs="bun .github/scripts/build-docs.ts";j.scripts["release:targets"]="bun .github/scripts/release-targets.ts";return JSON.stringify(j,null,2)+"\n";});
patch("tsconfig.json",s=>{const j=JSON.parse(s);j.include=["packages/*/src","plugins/*/src","plugins/*/*.ts",".github/scripts",".github/tests"];return JSON.stringify(j,null,2)+"\n";});
patch("nix/agent.nix",s=>s.replace('&& !(lib.hasPrefix ".github/" rel || rel == ".github")','&& (rel == ".github" || rel == ".github/scripts" || lib.hasPrefix ".github/scripts/" rel || !(lib.hasPrefix ".github/" rel))'));
patch(".github/scripts/agent-dispatch-preload.ts",s=>s.replace("globalThis.fetch = async (", "globalThis.fetch = (async (").replace(/\};\s*$/, "}) as typeof fetch;\n"));
patch("plugins/plugins/src/config.ts",s=>s.replaceAll('[join(darkFactoryDirectory(), "plugins")]','["plugins"]').replace('darkFactoryDirectory,\n\t','').replace('import { join, resolve } from "node:path";','import { resolve } from "node:path";'));
patch("plugins/docs/src/content.ts",s=>s.replace(/return \x60\$\{darkFactoryDirectory\(\)\}\/ADRs\.md\x60;/,'return ".agents/ARCHITECTURE.md";').replace('export const RULES_PLUGIN = ".darkfactory/plugins/df-rules";','export const RULES_PLUGIN = "plugins/df-rules";').replace('import { darkFactoryDirectory } from "../../protocol/src/config-document.ts";\n',''));
patch("plugins/docs/src/current.ts",s=>{
 const a=s.indexOf("const CURRENT_ALIASES = ["),b=s.indexOf("] as const;",a);
 if(a<0||b<0)throw Error("Cannot find docs aliases");
 s=s.slice(0,a)+'const CURRENT_ALIASES = [\n\t{ path: "README.md", target: ".agents/PRODUCT.md" },\n\t{ path: "CONTRIBUTING.md", target: ".agents/AGENTS.md" },\n] as const;'+s.slice(b+11);
 return s.replace('import { darkFactoryDirectory } from "../../protocol/src/config-document.ts";\n','').replaceAll('join(darkFactoryDirectory(), "notes")','join(".darkfactory", "notes")').replaceAll('join(darkFactoryDirectory(), "adr")','join(".darkfactory", "adr")').replace('"AGENTS.md",','"AGENTS.md",\n\t"ADRs.md",');
});
patch(".github/scripts/build-docs.ts",s=>s.replace(/capabilitiesRoot:\s*resolve\(import\.meta\.dir,[^\n]+\)/,'capabilitiesRoot: resolve(repoRoot, "plugins")'));
patch(".github/scripts/package-assets.ts",s=>s.replace('join(root, ".darkfactory", "plugins")','join(root, "plugins")'));
patch(".github/scripts/verify-target.ts",s=>s.replace("import { dirname, join, resolve } from \"node:path\";", "import { join, resolve } from \"node:path\";").replace('const harnessRoot = dirname(import.meta.dir);','const harnessRoot = resolve(import.meta.dir, "..", "..", "plugins", "harness");').replace('const repositoryRoot = resolve(harnessRoot, "..", "..");','const repositoryRoot = resolve(import.meta.dir, "..", "..");'));
patch(".github/tests/plugins/harness/test/ci/pipeline-source.ts",s=>s.replace(/export const repoRoot = join\(import\.meta\.dir,[^;]*;/,'export const repoRoot = join(import.meta.dir, "..", "..", "..", "..", "..", "..");'));
writeFileSync(".github/scripts/run-tests.ts", "import { readdir } from \"node:fs/promises\";\nimport { join, relative } from \"node:path\";\n\nconst repoRoot = join(import.meta.dir, \"..\", \"..\");\nconst testRoot = join(repoRoot, \".github\", \"tests\");\nasync function collect(root: string): Promise<string[]> {\n  const children = await readdir(root, { withFileTypes: true });\n  const nested = await Promise.all(children.map(async (entry) => {\n    const absolute = join(root, entry.name);\n    if (entry.isDirectory()) return collect(absolute);\n    if (!entry.isFile()) return [];\n    return /\\.(?:test|spec)\\.(?:ts|tsx|js|mjs)$/u.test(entry.name) ||\n      entry.name === \"test_action_resolution.ts\" ? [absolute] : [];\n  }));\n  return nested.flat();\n}\nconst files = (await collect(testRoot)).map((file) => "./" + relative(repoRoot, file)).sort();\nif (!files.length) throw new Error(\"No tests under .github/tests\");\nconsole.log(\"DarkFactory centralized test files: \" + files.length);\nconst run = Bun.spawnSync([\"bun\", \"test\", ...files, \"--timeout=30000\"], {\n  cwd: repoRoot, stdout: \"inherit\", stderr: \"inherit\"\n});\nprocess.exit(run.exitCode ?? 1);\n");
git("add","-A");
const tracked=git("ls-files").split("\n");
const stray=tracked.filter(p=>p.startsWith("scripts/")||p.startsWith("tests/")||p.startsWith(".darkfactory/plugins/")||(!p.startsWith(".github/tests/")&&(/(^|\/)test\//.test(p)||p.endsWith(".test.ts"))));
if(stray.length)throw Error("Stray test/scripts/plugin paths: "+stray.slice(0,20).join(","));
console.log("RESTRUCTURE_MOVED="+moves.length);
console.log("RESTRUCTURE_TESTS="+moves.filter(isTest).length);
console.log("RESTRUCTURE_EDITED="+edited);
