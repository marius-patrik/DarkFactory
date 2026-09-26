import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

function verifyRef(ref) {
  try {
    execSync(`git rev-parse --verify "${ref}"`, { stdio: 'ignore' });
    return true;
  } catch {
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

  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const configPath = join(__dirname, '..', 'repo.dfconfig');
    const config = JSON.parse(readFileSync(configPath, 'utf-8'));
    const devBranch = config?.repo?.identity?.development_branch;
    const defaultBranch = config?.repo?.identity?.default_branch;

    if (devBranch) {
      candidates.push(`origin/${devBranch}`);
      candidates.push(devBranch);
    }
    if (defaultBranch) {
      candidates.push(`origin/${defaultBranch}`);
      candidates.push(defaultBranch);
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
    execSync('git fetch origin --depth=1', { stdio: 'ignore' });
    for (const candidate of candidates) {
      if (verifyRef(candidate)) {
        return candidate;
      }
    }
  } catch {
    // Fetch failed
  }

  const fallback = 'origin/main';
  console.error(`Warning: Could not verify any base branch candidate. Falling back to ${fallback}.`);
  return fallback;
}

console.log(getBaseBranch());
