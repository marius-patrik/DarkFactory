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
  if (typeof ref !== 'string' || !/^[a-zA-Z0-9\/\-_.]+$/.test(ref)) {
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
    if (/^[a-zA-Z0-9\/\-_.]+$/.test(process.env.DF_BASE_SHA) && verifyRef(process.env.DF_BASE_SHA)) {
      return process.env.DF_BASE_SHA;
    }
  }

  const candidates = [];

  if (process.env.GITHUB_BASE_REF && /^[a-zA-Z0-9\/\-_.]+$/.test(process.env.GITHUB_BASE_REF)) {
    candidates.push(`origin/${process.env.GITHUB_BASE_REF}`, process.env.GITHUB_BASE_REF);
  }

  let configDefaultBranch = null;
  let configDevBranch = null;

  try {
    const configPath = process.env.DF_CONFIG_PATH || join(process.cwd(), 'repo.dfconfig');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    configDevBranch = typeof config?.repo?.identity?.development_branch === 'string' ? config.repo.identity.development_branch : null;
    configDefaultBranch = typeof config?.repo?.identity?.default_branch === 'string' ? config.repo.identity.default_branch : null;

    if (configDevBranch && /^[a-zA-Z0-9\/\-_.]+$/.test(configDevBranch)) {
      candidates.push(`origin/${configDevBranch}`);
      candidates.push(configDevBranch);
    }
    if (configDefaultBranch && /^[a-zA-Z0-9\/\-_.]+$/.test(configDefaultBranch)) {
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
    console.error("Attempting to fetch origin/ to resolve base branch...");
    execFileSync('git', ['fetch', 'origin', '--depth=1'], { stdio: 'pipe', timeout: 5000 });
    for (const candidate of candidates) {
      if (verifyRef(candidate)) {
        return candidate;
      }
    }
  } catch (e) {
    console.error(`Fetch operation failed: ${e.message}`);
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
