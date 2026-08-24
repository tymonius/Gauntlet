export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/images/media/')) {
      return new Response('Not found', { status: 404 });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    }

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
  },
};
