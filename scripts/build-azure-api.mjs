/**
 * Bundle the Azure Functions contact API into .azure-api/ so Azure Static Web
 * Apps can deploy it without its own build step (skip_api_build: true).
 * Usage: npm run build:azure-api
 */
import { build } from 'esbuild';
import { mkdir, copyFile, writeFile, rm } from 'node:fs/promises';

const out = '.azure-api';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

await build({
  entryPoints: ['azure-functions/contact.js'],
  outfile: `${out}/dist/contact.js`,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  minify: false,
  legalComments: 'none',
  // Provided by the Azure Functions Node.js worker at runtime.
  external: ['@azure/functions-core'],
});

await copyFile('azure-functions/host.json', `${out}/host.json`);
await writeFile(
  `${out}/package.json`,
  JSON.stringify({ name: 'contact-api', version: '1.0.0', private: true, main: 'dist/contact.js' }, null, 2),
);
console.log(`Azure API bundled into ${out}/`);
