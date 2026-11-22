// npm test: node's own runner over every test file, one file per core. node --test on its own runs one file
// fewer than the machine has cores, which on CI's 4-core runner left the suite (about 3,900 tests, a few long
// pose-solver checks) at the 10-minute job limit; using every core cut the wall time by about an eighth.
// Extra arguments pass through (npm test -- --test-name-pattern=crouch).
import {spawnSync} from 'node:child_process';
import {availableParallelism} from 'node:os';

const files = ['rainbow-bridge.test.js', '*.test.js', 'engine/*.test.js'];
const args = ['--test', `--test-concurrency=${Math.max(1, availableParallelism())}`, ...process.argv.slice(2), ...files];
const run = spawnSync(process.execPath, args, {stdio: 'inherit'});
process.exit(run.status ?? 1);
