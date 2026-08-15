import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('./dist/client/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const path of ['index.html', 'script.js', 'styles.css', 'assets']) {
  await cp(new URL(`./${path}`, import.meta.url), new URL(`./dist/client/${path}`, import.meta.url), { recursive: true });
}
console.log('Built static client in dist/client');
