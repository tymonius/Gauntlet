import { interactionsToCsv, isAdminAuthorized } from "./worker.js";

const LIVE_REVIEW_SCOPE_SQL = "session_id NOT LIKE 'qa_v071_%'";

export async function handleLiveReviewExport(request, env) {
  const origin = request.headers.get("Origin");
  if (!env.DB) return jsonResponse({ error: "Interaction logging is not configured." }, 503, origin);
  if (!env.ADMIN_TOKEN) return jsonResponse({ error: "Admin access is not configured." }, 503, origin);
  if (!await isAdminAuthorized(request, env)) return jsonResponse({ error: "Unauthorized." }, 401, origin);
  if (request.method !== "GET") return jsonResponse({ error: "Method not allowed." }, 405, origin);

  const url = new URL(request.url);
  const format = String(url.searchParams.get("format") || "json").toLowerCase();
  const interactions = await env.DB.prepare(`
    SELECT *
    FROM rules_interactions
    WHERE ${LIVE_REVIEW_SCOPE_SQL}
    ORDER BY created_at DESC
    LIMIT 10000
  `).all();
  const rows = (interactions.results || []).map(parseInteractionRow);

  if (format === "csv") {
    return new Response(interactionsToCsv(rows), {
      status: 200,
      headers: responseHeaders(origin, "text/csv; charset=utf-8", {
        "Content-Disposition": `attachment; filename="gauntlet-rules-interactions-${new Date().toISOString().slice(0, 10)}.csv"`
      })
    });
  }

  const [sources, reviews] = await Promise.all([
    env.DB.prepare(`
      SELECT source.*
      FROM rules_interaction_sources AS source
      INNER JOIN rules_interactions AS interaction ON interaction.id = source.interaction_id
      WHERE interaction.${LIVE_REVIEW_SCOPE_SQL}
      ORDER BY source.interaction_id, source.ordinal
    `).all(),
    env.DB.prepare(`
      SELECT review.*
      FROM rules_interaction_reviews AS review
      INNER JOIN rules_interactions AS interaction ON interaction.id = review.interaction_id
      WHERE interaction.${LIVE_REVIEW_SCOPE_SQL}
      ORDER BY review.created_at
    `).all()
  ]);

  return jsonResponse({
    exportedAt: new Date().toISOString(),
    interactions: rows,
    sources: sources.results || [],
    reviews: (reviews.results || []).map((review) => ({
      ...review,
      issueTypes: parseJsonArray(review.issue_types_json)
    }))
  }, 200, origin, {
    "Content-Disposition": `attachment; filename="gauntlet-rules-interactions-${new Date().toISOString().slice(0, 10)}.json"`
  });
}

function parseInteractionRow(row) {
  return {
    ...row,
    issueTypes: parseJsonArray(row.issue_types_json)
  };
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function responseHeaders(origin, contentType, extraHeaders = {}) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": contentType,
    "Vary": "Origin",
    ...extraHeaders
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function jsonResponse(value, status, origin, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders(origin, "application/json; charset=utf-8", extraHeaders)
  });
}
