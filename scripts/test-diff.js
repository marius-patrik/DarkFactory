
import { execSync } from 'child_process';

try {
  const output = execSync('git diff --name-only origin/develop -- harness', { encoding: 'utf-8' });
  console.log('FILES:', JSON.stringify(output));
} catch (err) {
  console.log('ERROR:', err.message);
}
