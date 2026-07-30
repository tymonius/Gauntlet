import worker from "./worker.js";
import { ADMIN_PAGE_WITH_IMPORT } from "./admin-import-page.js";

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)) {
      const response = await worker.fetch(request, env, context);
      return new Response(ADMIN_PAGE_WITH_IMPORT, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });
    }
    return worker.fetch(request, env, context);
  }
};
