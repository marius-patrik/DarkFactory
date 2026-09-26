import { readFileSync } from 'fs';
import { join } from 'path';

function getBaseBranch() {
  if (process.env.DF_BASE_SHA) {
    return process.env.DF_BASE_SHA;
  }
  try {
    const config = JSON.parse(readFileSync(join(process.cwd(), 'repo.dfconfig'), 'utf-8'));
    const branch = config?.repo?.identity?.development_branch || config?.repo?.identity?.default_branch;
    if (branch) {
      return `origin/${branch}`;
    }
  } catch {
    // Fallback if config is missing, unreadable, or malformed
  }
  return 'origin/darkfactory';
}

console.log(getBaseBranch());
