import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';

try {
  execSync('git --version', { stdio: 'ignore' });
} catch {
  console.error("Error: git command not found. This workspace requires git to be installed and available in the PATH to resolve branch metadata.");
  process.exit(1);
}

const REF_REGEX = /^[a-zA-Z0-9\/\-_.]+$/;

function verifyRef(ref) {
  if (typeof ref !== 'string' || !REF_REGEX.test(ref)) {
    console.error(`Invalid ref format: ${ref}`);
    return false;
  }
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' });
    return true;
  } catch (e) {
    // Only log if it's a real failure, not just a missing ref
    return false;
  }
}

function getBaseBranch() {
  if (process.env.DF_BASE_SHA) {
    if (REF_REGEX.test(process.env.DF_BASE_SHA) && verifyRef(process.env.DF_BASE_SHA)) {
      return process.env.DF_BASE_SHA;
    }
  }

  const candidates = [];

  if (process.env.GITHUB_BASE_REF && REF_REGEX.test(process.env.GITHUB_BASE_REF)) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`, process.env.GITHUB_BASE_REF);
  }

  let configDefaultBranch = null;
  let configDevBranch = null;

  try {
    const configPath = process.env.DF_CONFIG_PATH || join(process.cwd(), 'repo.dfconfig');
    const content = readFileSync(configPath, 'utf-8');
    let config;
    try {
      config = JSON.parse(content);
    } catch (e) {
      console.error(`Warning: Failed to parse ${configPath} as JSON: ${e.message}`);
      throw e; // continue to catch block below
    }
    configDevBranch = typeof config?.repo?.identity?.development_branch === 'string' ? config.repo.identity.development_branch : null;
    configDefaultBranch = typeof config?.repo?.identity?.default_branch === 'string' ? config.repo.identity.default_branch : null;

    if (configDevBranch && REF_REGEX.test(configDevBranch)) {
      candidates.push(`origin/${configDevBranch}`);
      candidates.push(configDevBranch);
    }
    if (configDefaultBranch && REF_REGEX.test(configDefaultBranch)) {
      candidates.push(`origin/${configDefaultBranch}`);
      candidates.push(configDefaultBranch);
    }
  } catch {
    // Config missing, unreadable, or malformed (parse errors logged above)
  }

  // Check candidates from GITHUB_BASE_REF or repo.dfconfig
  for (const candidate of candidates) {
    if (verifyRef(candidate)) {
      return candidate;
    }
  }

  // Removed: automatic git fetch to prevent CI flakiness and security issues.
  // The CI environment must have the necessary refs available.

  console.error(`Error: Could not verify any base branch candidate. Ensure your CI environment has appropriate fetch depth.`);
  process.exit(1);
}

console.log(getBaseBranch());
