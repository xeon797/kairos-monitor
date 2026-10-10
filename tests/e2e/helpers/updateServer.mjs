import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, sep } from 'node:path';

// Real localhost HTTP server: browser routing cannot intercept SW update fetches.
export async function startUpdateServer() {
  let generation = 1;
  const root = resolve('dist');
  const server = createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      const file = resolve(root, '.' + (pathname === '/' || /^\/(today|mission|trends|check)$/.test(pathname) ? '/index.html' : pathname));
      if (!file.startsWith(root + sep)) { response.writeHead(403).end(); return; }
      let body = await readFile(file);
      if (pathname === '/sw.js') body = body.toString() + `\n// update-verification-generation-${generation}\n`;
      response.setHeader('Cache-Control', 'no-store');
      const extension = file.split('.').pop();
      response.setHeader('Content-Type', ({ js: 'text/javascript', html: 'text/html', css: 'text/css', woff2: 'font/woff2', png: 'image/png', jpg: 'image/jpeg', webmanifest: 'application/manifest+json' })[extension] ?? 'application/octet-stream');
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('No test server');
  return { origin: `http://127.0.0.1:${address.port}`, update: () => { generation++; }, close: () => new Promise(resolve => server.close(resolve)) };
}
