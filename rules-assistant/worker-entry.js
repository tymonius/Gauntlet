import worker from "./worker-v061.js";
import smartWorker from "./smart-worker.js";
import reliableWorker from "./reliable-worker.js";
import { ADMIN_PAGE_WITH_INCREMENTAL_EXPORT } from "./admin-incremental-export-page.js";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js";
import { handleReviewIntelligence } from "./review-intelligence.js";

const ADMIN_PAGE = ADMIN_PAGE_WITH_RULES_INTELLIGENCE || ADMIN_PAGE_WITH_INCREMENTAL_EXPORT;

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/review-export-checkpoint") {
      return handleReviewExportCheckpoint(request, env);
    }

    if (
      url.pathname === "/api/admin/review-intelligence" ||
      url.pathname === "/api/admin/review-corpus" ||
      url.pathname === "/api/admin/review-audits" ||
      url.pathname === "/api/admin/summary" ||
      (request.method === "GET" && url.pathname === "/api/admin/interactions")
    ) {
      return handleReviewIntelligence(request, env);
    }

    if (request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)) {
      const response = await worker.fetch(request, env, context);
      return new Response(ADMIN_PAGE, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }

    if (String(env.RULES_RELIABLE_FALLBACK || "on").toLowerCase() === "off") {
      return smartWorker.fetch(request, env, context);
    }
    return reliableWorker.fetch(request, env, context);
  }
};
