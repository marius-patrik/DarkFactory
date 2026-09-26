
import { spawnSync } from 'child_process';

const res = spawnSync('bun', ['run', 'format:check'], { encoding: 'utf-8', stdio: 'inherit' });
console.log('EXIT CODE:', res.status);
process.exit(res.status ?? 1);
