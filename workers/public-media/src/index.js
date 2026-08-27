const TTS_PUBLIC_PREFIX = '/tts/v0.7.0/';
const TTS_PUBLIC_ORIGIN = 'https://gauntlet.run';
const TTS_APPROVED_RELEASE_PREFIX =
  'https://github.com/tymonius/Gauntlet/releases/download/tts-v0.7.0-qa-pr-909-fe5940376a74/';
const TTS_APPROVED_PREVIEW_SAVE = 'Gauntlet_v0.7.0_TTS_PR909_Preview.json';
const TTS_PUBLIC_SAVE = 'Gauntlet_v0.7.0_TTS_Mod.json';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

    if (url.pathname.startsWith('/images/media/')) {
      return servePublicMedia(request, env);
    }

    if (url.pathname.startsWith(TTS_PUBLIC_PREFIX)) {
      return serveApprovedTtsAsset(request, url);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function servePublicMedia(request, env) {
  const response = await env.ASSETS.fetch(request);
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  headers.set('X-Content-Type-Options', 'nosniff');

  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveApprovedTtsAsset(request, url) {
  const assetName = decodeURIComponent(url.pathname.slice(TTS_PUBLIC_PREFIX.length));
  if (!assetName || assetName.includes('/') || assetName.includes('\\') || assetName === '.' || assetName === '..') {
    return new Response('Not found', { status: 404 });
  }

  if (assetName === TTS_PUBLIC_SAVE) {
    return serveApprovedTtsSave(request);
  }

  const upstream = new URL(encodeURIComponent(assetName), TTS_APPROVED_RELEASE_PREFIX);
  const response = await fetch(upstream.toString(), {
    method: request.method,
    redirect: 'follow',
  });
  if (!response.ok) {
    return new Response('Upstream asset unavailable', { status: 502 });
  }

  const headers = new Headers(response.headers);
  headers.delete('Content-Disposition');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Gauntlet-TTS-Source', 'pr-909-fe5940376a74');

  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function serveApprovedTtsSave(request) {
  const upstream = new URL(TTS_APPROVED_PREVIEW_SAVE, TTS_APPROVED_RELEASE_PREFIX);
  const response = await fetch(upstream.toString(), { redirect: 'follow' });
  if (!response.ok) {
    return new Response('Approved TTS save unavailable', { status: 502 });
  }

  if (request.method === 'HEAD') {
    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        'X-Gauntlet-TTS-Source': 'pr-909-fe5940376a74',
      },
    });
  }

  const source = await response.text();
  if (!source.includes(TTS_APPROVED_RELEASE_PREFIX)) {
    return new Response('Approved TTS save has unexpected asset URLs', { status: 502 });
  }

  const publicPrefix = `${TTS_PUBLIC_ORIGIN}${TTS_PUBLIC_PREFIX}`;
  const rewritten = source.split(TTS_APPROVED_RELEASE_PREFIX).join(publicPrefix);

  try {
    JSON.parse(rewritten);
  } catch {
    return new Response('Approved TTS save is invalid JSON', { status: 502 });
  }

  return new Response(rewritten, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Gauntlet-TTS-Source': 'pr-909-fe5940376a74',
    },
  });
}
