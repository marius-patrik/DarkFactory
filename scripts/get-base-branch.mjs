import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';

try {
  execSync('git --version', { stdio: 'ignore' });
} catch {
  console.error("Error: git command not found. Please ensure git is installed and in your PATH.");
  process.exit(1);
}

function verifyRef(ref) {
  try {
    execFileSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' });
    return true;
  } catch (e) {
    console.error(`Verification of ref ${ref} failed: ${e.message}`);
    return false;
  }
}

function getBaseBranch() {
  if (process.env.DF_BASE_SHA) {
    if (verifyRef(process.env.DF_BASE_SHA)) {
      return process.env.DF_BASE_SHA;
    }
  }

  const candidates = [];

  if (process.env.GITHUB_BASE_REF) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`, process.env.GITHUB_BASE_REF);
  }

  let configDefaultBranch = null;
  let configDevBranch = null;

  try {
    const configPath = process.env.DF_CONFIG_PATH || join(process.cwd(), 'repo.dfconfig');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    configDevBranch = config?.repo?.identity?.development_branch;
    configDefaultBranch = config?.repo?.identity?.default_branch;

    if (configDevBranch) {
      candidates.push(`origin/${configDevBranch}`);
      candidates.push(configDevBranch);
    }
    if (configDefaultBranch) {
      candidates.push(`origin/${configDefaultBranch}`);
      candidates.push(configDefaultBranch);
    }
  } catch {
    // Config missing, unreadable, or malformed
  }

  // Fall back to standard default branches instead of origin/darkfactory
  candidates.push('origin/develop', 'develop', 'origin/main', 'main', 'HEAD~1');

  // Check candidates
  for (const candidate of candidates) {
    if (verifyRef(candidate)) {
      return candidate;
    }
  }

  // Attempt fetching origin if remote refs are absent (e.g. shallow checkout / CI)
  try {
    execFileSync('git', ['fetch', 'origin', '--depth=1'], { stdio: 'ignore', timeout: 30000 });
    for (const candidate of candidates) {
      if (verifyRef(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Fetch failed
  }

  const fallback = configDefaultBranch ? `origin/${configDefaultBranch}` : (configDevBranch ? `origin/${configDevBranch}` : 'origin/main');
  
  if (verifyRef(fallback)) {
    console.error(`Warning: Could not verify any primary candidate. Falling back to ${fallback}.`);
    return fallback;
  }

  console.error(`Error: Could not verify any base branch candidate (including fallback ${fallback}).`);
  process.exit(1);
}

console.log(getBaseBranch());
