import worker from './index-publish.js';

function isArtworkApi(request) {
  try {
    return new URL(request.url).pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

async function normalizeExpiredSession(response) {
  if (response.status !== 500) return response;

  const copy = response.clone();
  const payload = await copy.json().catch(() => null);
  const message = String(payload?.error || '');
  if (!/authoring session (?:expired|invalid)/i.test(message)) return response;

  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store');
  headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const response = await worker.fetch(request, env);
    if (!isArtworkApi(request)) return response;
    return normalizeExpiredSession(response);
  },
};
