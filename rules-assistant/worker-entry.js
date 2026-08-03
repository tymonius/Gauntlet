import worker from "./smart-worker.js";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js";
import { handleReviewIntelligence } from "./review-intelligence.js";

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
      return new Response(ADMIN_PAGE_WITH_RULES_INTELLIGENCE, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    return worker.fetch(request, env, context);
  }
};
