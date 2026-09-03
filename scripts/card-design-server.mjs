#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateArtDirectionMap } from './art-direction-overrides.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUTHORITY_FILE = join(ROOT, 'game-data', 'current-game.json');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 4173);

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function json(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  response.end(JSON.stringify(body));
}

function readBody(request, limit = 64 * 1024) {
  return new Promise((resolveBody, rejectBody) => {
    let size = 0;
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      size += Buffer.byteLength(chunk);
      if (size > limit) {
        rejectBody(new Error('Request body is too large.'));
        request.destroy();
        return;
      }
      body += chunk;
    });
    request.on('end', () => resolveBody(body));
    request.on('error', rejectBody);
  });
}

async function loadAuthority() {
  const authority = JSON.parse(await readFile(AUTHORITY_FILE, 'utf8'));
  if (authority?.schemaVersion !== 2 || authority?.authority !== 'current-game') {
    throw new Error('Artwork authoring requires the complete current-game authority.');
  }
  return authority;
}

async function loadMap() {
  const authority = await loadAuthority();
  return authority.artDirection && typeof authority.artDirection === 'object' ? authority.artDirection : {};
}

async function saveMap(map) {
  const authority = await loadAuthority();
  const temporary = `${AUTHORITY_FILE}.tmp`;
  const next = { ...authority, artDirection: map };
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  await rename(temporary, AUTHORITY_FILE);
}

async function handleArtDirectionApi(request, response) {
  if (request.method === 'GET') {
    json(response, 200, { directions: await loadMap() });
    return true;
  }
  if (request.method !== 'POST') return false;

  const payload = JSON.parse(await readBody(request));
  const before = await loadMap();
  const after = updateArtDirectionMap(before, payload?.id, payload?.direction);
  await saveMap(after);
  json(response, 200, {
    saved: true,
    id: String(payload?.id || ''),
    direction: after[String(payload?.id || '')] || null,
    file: 'game-data/current-game.json#artDirection',
  });
  return true;
}

async function serveStatic(request, response, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { allow: 'GET, HEAD' }).end('Method Not Allowed');
    return;
  }

  const decoded = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  let requested = resolve(ROOT, decoded || 'card-design/index.html');
  if (!requested.startsWith(`${ROOT}${sep}`) && requested !== ROOT) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  let metadata;
  try {
    metadata = await stat(requested);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      response.writeHead(404).end('Not Found');
      return;
    }
    throw error;
  }
  if (metadata.isDirectory()) requested = join(requested, 'index.html');

  const contents = await readFile(requested);
  response.writeHead(200, {
    'content-type': MIME_TYPES[extname(requested).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  if (request.method === 'HEAD') response.end();
  else response.end(contents);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${HOST}:${PORT}`);
    if (url.pathname === '/api/art-direction') {
      if (await handleArtDirectionApi(request, response)) return;
      response.writeHead(405, { allow: 'GET, POST' }).end('Method Not Allowed');
      return;
    }
    await serveStatic(request, response, url);
  } catch (error) {
    console.error(error);
    if (!response.headersSent) json(response, 400, { error: error instanceof Error ? error.message : String(error) });
    else response.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Gauntlet card-design compositor: http://${HOST}:${PORT}/card-design/`);
  console.log('Save position writes game-data/current-game.json#artDirection directly.');
  console.log('When the compositing pass is finished, run: npm run card-authority:check && npm run card-authority:render');
});
