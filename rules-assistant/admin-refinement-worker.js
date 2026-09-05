import worker from "./worker-entry.js";
import { enhanceRulesTriageAdmin } from "./admin-triage-page.js";

export * from "./worker-entry.js";

export default {
  async fetch(request, env, context) {
    const response = await worker.fetch(request, env, context);
    if (request.method !== "GET") return response;

    const url = new URL(request.url);
    if (!["/admin", "/admin/"].includes(url.pathname)) return response;

    const contentType = String(response.headers.get("Content-Type") || "");
    if (!contentType.includes("text/html")) return response;

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("Content-Length");
    return new Response(enhanceRulesTriageAdmin(html), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
