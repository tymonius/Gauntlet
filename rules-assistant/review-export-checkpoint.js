import { isAdminAuthorized } from "./worker.js";

const TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS rules_review_export_checkpoints (
    scope_key TEXT PRIMARY KEY,
    scope_json TEXT NOT NULL,
    checkpoint_at TEXT NOT NULL,
    checkpoint_interaction_id TEXT,
    updated_at TEXT NOT NULL
  )
`;

const REVIEW_STATUSES = new Set(["unreviewed", "correct", "needs_correction", "rules_unclear", "duplicate"]);
const FEEDBACK_VALUES = new Set(["none", "yes", "unclear", "incorrect"]);
const RULING_VALUES = new Set([
  "explicit", "inferred", "provisional", "out_of_scope", "unresolved", "source_lookup"
]);
const CONFIDENCE_VALUES = new Set(["high", "medium", "low"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let schemaPromise;

export async function handleReviewExportCheckpoint(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.DB) return json({ error: "Interaction logging is not configured." }, 503);
  if (!env.ADMIN_TOKEN) return json({ error: "Admin access is not configured." }, 503);
  if (!await isAdminAuthorized(request, env)) return json({ error: "Unauthorized." }, 401);

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  let filters;
  try {
    filters = normalizeExportFilters(payload?.filters);
  } catch (error) {
    return json({ error: error.message }, 400);
  }

  const action = String(payload?.action || "get").trim();
  const scopeJson = JSON.stringify(filters);
  const scopeKey = await hashScope(scopeJson);

  try {
    await ensureSchema(env);

    if (action === "get") {
      const row = await env.DB.prepare(`
        SELECT checkpoint_at, checkpoint_interaction_id, updated_at
        FROM rules_review_export_checkpoints
        WHERE scope_key = ?
      `).bind(scopeKey).first();
      return json({
        filters,
        checkpoint: row ? {
          createdAt: row.checkpoint_at,
          interactionId: row.checkpoint_interaction_id || null,
          recordedAt: row.updated_at
        } : null
      });
    }

    if (action === "reset") {
      await env.DB.prepare("DELETE FROM rules_review_export_checkpoints WHERE scope_key = ?")
        .bind(scopeKey)
        .run();
      return json({ ok: true, filters, checkpoint: null });
    }

    const now = new Date().toISOString();
    let checkpoint;
    if (action === "mark_now") {
      checkpoint = { createdAt: now, interactionId: null };
    } else if (action === "set") {
      try {
        checkpoint = normalizeCheckpoint(payload?.checkpoint);
      } catch (error) {
        return json({ error: error.message }, 400);
      }
      if (Date.parse(checkpoint.createdAt) > Date.now() + 5 * 60 * 1000) {
        return json({ error: "Checkpoint cannot be in the future." }, 400);
      }
    } else {
      return json({ error: "Unknown checkpoint action." }, 400);
    }

    await env.DB.prepare(`
      INSERT INTO rules_review_export_checkpoints (
        scope_key, scope_json, checkpoint_at, checkpoint_interaction_id, updated_at
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(scope_key) DO UPDATE SET
        scope_json = excluded.scope_json,
        checkpoint_at = excluded.checkpoint_at,
        checkpoint_interaction_id = excluded.checkpoint_interaction_id,
        updated_at = excluded.updated_at
    `).bind(
      scopeKey,
      scopeJson,
      checkpoint.createdAt,
      checkpoint.interactionId,
      now
    ).run();

    return json({
      ok: true,
      filters,
      checkpoint: { ...checkpoint, recordedAt: now }
    });
  } catch (error) {
    console.error("Review export checkpoint failure", error);
    return json({ error: "Could not read or update the review export checkpoint." }, 500);
  }
}

export function normalizeExportFilters(value) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Export filters must be an object.");
  }

  const filters = {};
  const q = String(value.q || "").trim().toLowerCase();
  if (q) filters.q = q.slice(0, 200);

  const reviewStatus = String(value.reviewStatus || "").trim();
  if (reviewStatus) {
    if (!REVIEW_STATUSES.has(reviewStatus)) throw new Error("Invalid review-status filter.");
    filters.reviewStatus = reviewStatus;
  }

  const feedback = String(value.feedback || "").trim();
  if (feedback) {
    if (!FEEDBACK_VALUES.has(feedback)) throw new Error("Invalid feedback filter.");
    filters.feedback = feedback;
  }

  const rulingStatus = String(value.rulingStatus || "").trim();
  if (rulingStatus) {
    if (!RULING_VALUES.has(rulingStatus)) throw new Error("Invalid ruling-status filter.");
    filters.rulingStatus = rulingStatus;
  }

  const confidence = String(value.confidence || "").trim();
  if (confidence) {
    if (!CONFIDENCE_VALUES.has(confidence)) throw new Error("Invalid confidence filter.");
    filters.confidence = confidence;
  }

  return filters;
}

export function normalizeCheckpoint(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Checkpoint must be an object.");
  }
  const createdAt = String(value.createdAt || "").trim();
  if (!createdAt || Number.isNaN(Date.parse(createdAt))) {
    throw new Error("Checkpoint createdAt must be a valid date.");
  }
  const interactionId = value.interactionId == null || value.interactionId === ""
    ? null
    : String(value.interactionId).trim();
  if (interactionId && !UUID_PATTERN.test(interactionId)) {
    throw new Error("Checkpoint interactionId must be a UUID or null.");
  }
  return { createdAt: new Date(createdAt).toISOString(), interactionId };
}

async function ensureSchema(env) {
  if (!schemaPromise) {
    schemaPromise = env.DB.prepare(TABLE_SQL).run().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

async function hashScope(scopeJson) {
  const bytes = new TextEncoder().encode(scopeJson);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
