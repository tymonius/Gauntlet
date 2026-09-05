import worker from "./worker-entry.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";
import {
  ADMIN_REFINEMENT_RUNTIME_PATH,
  adminRefinementRuntimeSource,
  allowAdminRefinementRuntime
} from "./admin-refinement-runtime.js";

export * from "./worker-entry.js";

const INLINE_RUNTIME_ID = "rules-refinement-inline-runtime";

function attachInlineRefinementRuntime(html) {
  const source = String(html || "");
  if (!source || source.includes(`id="${INLINE_RUNTIME_ID}"`)) return source;
  const tag = `<script id="${INLINE_RUNTIME_ID}">\n${adminRefinementRuntimeSource()}\n</script>`;
  return source.includes("</body>") ? source.replace("</body>", `${tag}\n</body>`) : `${source}\n${tag}`;
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === ADMIN_REFINEMENT_RUNTIME_PATH) {
      return new Response(adminRefinementRuntimeSource(), {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/javascript; charset=utf-8",
          "X-Content-Type-Options": "nosniff"
        }
      });
    }

    const response = await worker.fetch(request, env, context);
    if (request.method !== "GET") return response;
    if (!["/admin", "/admin/"].includes(url.pathname)) return response;

    const contentType = String(response.headers.get("Content-Type") || "");
    if (!contentType.includes("text/html")) return response;

    const html = await response.text();
    const headers = new Headers(response.headers);
    headers.delete("Content-Length");
    const policy = allowAdminRefinementRuntime(headers.get("Content-Security-Policy"));
    if (policy) headers.set("Content-Security-Policy", policy);
    return new Response(attachInlineRefinementRuntime(enhanceRulesScaffoldAdmin(html)), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};
