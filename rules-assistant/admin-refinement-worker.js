import worker from "./worker-entry.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";
import {
  ADMIN_REFINEMENT_RUNTIME_PATH,
  adminRefinementRuntimeSource,
  allowAdminRefinementRuntime
} from "./admin-refinement-runtime.js";
import { refinementTriage } from "./refinement-triage.js";
import { refinementScaffold } from "./refinement-scaffold.js";
import {
  applyRefinementResolutionLedger,
  refinementResolutionLedger
} from "./refinement-resolution-ledger.js";
import { applyCurrentValidityToRefinementReport } from "./refinement-current-validity.js";
import { handleV071ScopePrecheck } from "./v071-scope-precheck.js";

export * from "./worker-entry.js";

const INLINE_RUNTIME_ID = "rules-refinement-inline-runtime";
const TRIAGE_API_PATH = "/api/admin/refinement-triage";
const SCAFFOLD_API_PATH = "/api/admin/refinement-scaffold";

function attachInlineRefinementRuntime(html) {
  const source = String(html || "");
  if (!source || source.includes(`id="${INLINE_RUNTIME_ID}"`)) return source;
  const startup = "var rulesRefinementStatus=document.getElementById('triage-status');if(rulesRefinementStatus)rulesRefinementStatus.textContent='Refinement runtime starting…';";
  const tag = `<script id="${INLINE_RUNTIME_ID}">\n${startup}\n${adminRefinementRuntimeSource()}\n</script>`;
  return source.includes("</body>") ? source.replace("</body>", `${tag}\n</body>`) : `${source}\n${tag}`;
}

function adminSubrequest(request, path) {
  const url = new URL(path, request.url);
  return new Request(url, {
    method: "GET",
    headers: request.headers
  });
}

function jsonResponse(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders
    }
  });
}

function normalizedScope(url) {
  return url.searchParams.get("scope") === "reviewed_backlog" ? "reviewed_backlog" : "unreviewed";
}

async function loadRefinementReport(request, env, context, scope) {
  const [exportResponse, intelligenceResponse] = await Promise.all([
    worker.fetch(adminSubrequest(request, "/api/admin/export?format=json"), env, context),
    worker.fetch(adminSubrequest(request, "/api/admin/review-intelligence"), env, context)
  ]);

  if (!exportResponse.ok) return { errorResponse: exportResponse };
  if (!intelligenceResponse.ok) return { errorResponse: intelligenceResponse };

  const [exportPayload, intelligencePayload] = await Promise.all([
    exportResponse.json(),
    intelligenceResponse.json()
  ]);
  const rawReport = refinementTriage.triageInteractions(
    Array.isArray(exportPayload?.interactions) ? exportPayload.interactions : [],
    intelligencePayload || {},
    { scope }
  );
  const currentReport = applyCurrentValidityToRefinementReport(
    rawReport,
    Array.isArray(intelligencePayload?.audits) ? intelligencePayload.audits : []
  );
  const report = applyRefinementResolutionLedger(currentReport, refinementResolutionLedger);
  return { report };
}

export async function handleAdminRefinementApi(request, env, context) {
  const url = new URL(request.url);
  if (![TRIAGE_API_PATH, SCAFFOLD_API_PATH].includes(url.pathname)) return null;
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405);

  const scope = normalizedScope(url);
  const loaded = await loadRefinementReport(request, env, context, scope);
  if (loaded.errorResponse) return loaded.errorResponse;

  if (url.pathname === TRIAGE_API_PATH) return jsonResponse(loaded.report);

  const rootCause = String(url.searchParams.get("rootCause") || "").trim();
  if (!/^[a-z_]{2,80}$/.test(rootCause)) {
    return jsonResponse({ error: "A valid refinement root cause is required." }, 400);
  }
  try {
    const scaffold = refinementScaffold.buildRefinementScaffold(loaded.report, rootCause);
    return jsonResponse(scaffold, 200, {
      "Content-Disposition": `attachment; filename="gauntlet-rules-refinement-${rootCause}-${new Date().toISOString().slice(0, 10)}.json"`
    });
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Could not build refinement scaffold." }, 400);
  }
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    const refinementResponse = await handleAdminRefinementApi(request, env, context);
    if (refinementResponse) return refinementResponse;

    const scopeResponse = await handleV071ScopePrecheck(request, env);
    if (scopeResponse) return scopeResponse;

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
