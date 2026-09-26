
import { spawnSync } from 'child_process';

const res = spawnSync('bun', ['x', 'biome', 'ci', '--changed', '--since=origin/develop', '.'], { cwd: 'harness', encoding: 'utf-8' });
console.log('EXIT CODE:', res.status);
console.log('STDOUT:', res.stdout);
console.log('STDERR:', res.stderr);
