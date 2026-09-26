
import { readFileSync } from 'fs';
import { join } from 'path';

function getBaseBranch() {
  const config = JSON.parse(readFileSync(join(process.cwd(), 'repo.dfconfig'), 'utf-8'));
  return config.repo.identity.development_branch || config.repo.identity.default_branch;
}

console.log(`origin/${getBaseBranch()}`);
