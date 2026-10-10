// Read-only public verification. No POST/provider request or secret inspection.
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'https://kairos-monitor-gamma.vercel.app';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(path));
    else if (/\.(html|js|css|woff2|png|jpg|webmanifest)$/.test(entry.name)) result.push(path);
  }
  return result;
}
const assets = await Promise.all((await files('dist')).map(async local => {
  const path = local === 'dist/index.html' ? '/' : local.slice(4);
  const response = await fetch(new URL(path, base), { cache: 'no-store' });
  const bytes = Buffer.from(await response.arrayBuffer()), localBytes = await readFile(local);
  const sha256 = hash(bytes), matches = response.ok && sha256 === hash(localBytes);
  if (!matches) throw new Error(`Public asset mismatch: ${path} (${response.status})`);
  return { path, status: response.status, bytes: bytes.length, sha256, matches, contentType: response.headers.get('content-type'), cacheControl: response.headers.get('cache-control') };
}));
const head = await fetch(base, { method: 'HEAD', cache: 'no-store' });
if (!head.ok || head.headers.get('x-kairos-explanations') !== 'v1') throw new Error('Missing endpoint capability');
const api = await fetch(new URL('/api/explain', base), { cache: 'no-store' });
if (api.status !== 405 || !api.headers.get('cache-control')?.includes('no-store')) throw new Error('Incorrect API GET response');
const worker = assets.find(asset => asset.path === '/sw.js');
if (!worker || !worker.contentType?.includes('javascript')) throw new Error('Worker not served as JavaScript');
const swText = await readFile('dist/sw.js', 'utf8');
if (/url:\s*["']\/?api\//.test(swText)) throw new Error('Unexpected API precache');
await mkdir('.local', { recursive: true });
const evidence = { revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), base, checkedAt: new Date().toISOString(), assets, apiStatus: api.status, apiCacheControl: api.headers.get('cache-control'), capability: 'v1', providerCalls: 0 };
await writeFile('.local/p11-public-assets.json', JSON.stringify(evidence, null, 2));
console.log(`${assets.length} runtime assets including shell/worker/fonts/icons/manifest match; API GET 405/no-store; capability v1; zero provider calls.`);
