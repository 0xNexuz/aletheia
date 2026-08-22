import { cp, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

await rm(new URL('./dist/', import.meta.url), { recursive: true, force: true });
execFileSync(process.execPath, [new URL('../node_modules/typescript/bin/tsc', import.meta.url).pathname, '--project', 'tsconfig.build.json'], { cwd: new URL('.', import.meta.url), stdio: 'inherit' });
await mkdir(new URL('./dist/', import.meta.url), { recursive: true });
await cp(new URL('./src/managed/', import.meta.url), new URL('./dist/managed/', import.meta.url), { recursive: true });
await cp(new URL('./src/aletheia.compact', import.meta.url), new URL('./dist/aletheia.compact', import.meta.url));
await cp(new URL('./src/schnorr.compact', import.meta.url), new URL('./dist/schnorr.compact', import.meta.url));
