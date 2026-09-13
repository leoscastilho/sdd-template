#!/usr/bin/env node
// Serve specs/__generated__/ over localhost so the dashboard can be previewed in a real browser tab.
// Zero dependencies; resolves its directory from its own path (no cwd needed). Usage: node scripts/spec/serve-dashboard.mjs [port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'specs', '__generated__');
const port = Number(process.argv[2] || 8765);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

const root = dir + path.sep;
// Confine to `dir` with a separator-aware prefix test: plain startsWith(dir) also admits siblings such as
// `__generated__.bak/`. Re-check after realpath so a symlink cannot point out of the root, and reject a foreign
// Host so a hostile page cannot read the spec corpus by DNS-rebinding onto this loopback port (SEC-4).
const inRoot = p => p === dir || p.startsWith(root);

http.createServer((req, res) => {
  const notFound = () => { res.writeHead(404); res.end('not found'); };
  const host = req.headers.host || '';
  if (!/^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(host)) return notFound();
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); } catch { return notFound(); }
  const file = path.normalize(path.join(dir, urlPath.endsWith('/') ? urlPath + 'dashboard.html' : urlPath));
  if (!inRoot(file) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return notFound();
  let real;
  try { real = fs.realpathSync(file); } catch { return notFound(); }
  if (!inRoot(real)) return notFound();
  res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`serving ${dir} at http://127.0.0.1:${port}/`));
