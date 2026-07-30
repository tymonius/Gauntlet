import worker from "./worker-v061.js";
import { ADMIN_PAGE_WITH_INCREMENTAL_EXPORT } from "./admin-incremental-export-page.js";
import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js";

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/review-export-checkpoint") {
      return handleReviewExportCheckpoint(request, env);
    }

    if (request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)) {
      const response = await worker.fetch(request, env, context);
      return new Response(ADMIN_PAGE_WITH_INCREMENTAL_EXPORT, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    return worker.fetch(request, env, context);
  }
};
