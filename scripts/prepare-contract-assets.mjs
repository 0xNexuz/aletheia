import { cp, mkdir } from 'node:fs/promises';

const source = new URL('../contract/src/managed/aletheia/', import.meta.url);
const target = new URL('../public/', import.meta.url);
await mkdir(target, { recursive: true });
await cp(new URL('keys/', source), new URL('keys/', target), { recursive: true });
await cp(new URL('zkir/', source), new URL('zkir/', target), { recursive: true });
