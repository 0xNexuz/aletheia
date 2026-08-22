import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const generatedContract = new URL('../contract/src/managed/aletheia/contract/index.js', import.meta.url);

if (existsSync(generatedContract)) {
  console.log('Compact managed artifacts are present.');
  process.exit(0);
}

if (process.platform !== 'linux' && process.platform !== 'darwin') {
  throw new Error(
    'Compact managed artifacts are missing. Run "npm run compact" in WSL/Linux, then retry the build.',
  );
}

console.log('Compact managed artifacts are missing; installing the verified toolchain and compiling.');
execFileSync(
  'sh',
  [
    '-lc',
    "curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh",
  ],
  { stdio: 'inherit' },
);

const compact = join(homedir(), '.local', 'bin', 'compact');
execFileSync(compact, ['update'], { stdio: 'inherit' });
execFileSync(
  compact,
  ['compile', 'contract/src/aletheia.compact', 'contract/src/managed/aletheia'],
  { cwd: new URL('..', import.meta.url), stdio: 'inherit' },
);
