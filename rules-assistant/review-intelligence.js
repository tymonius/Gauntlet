import { isAdminAuthorized } from "./worker.js";
import { buildRulesCorpus } from "./local-search.js";
import { V071_RULES_VERSION, defaultV071SourceUrls, loadV071RulesCorpus } from "./v071-public-corpus.js";
import { buildCorpusReviewSnapshot } from "./rules-intelligence.js";

const HISTORICAL_ACCURACY = new Set(["correct", "incorrect", "indeterminate", "not_applicable"]);
const CURRENT_VALIDITY = new Set(["current", "stale", "superseded", "indeterminate", "not_applicable"]);
const RETRIEVAL_ASSESSMENT = new Set(["sufficient", "weak", "failure", "not_applicable"]);
const CLASSIFICATION_ASSESSMENT = new Set([
  "correct", "should_be_explicit", "should_be_inferred", "should_be_provisional",
  "should_be_out_of_scope", "indeterminate"
]);
const RECOMMENDED_ACTIONS = new Set([
  "none", "regression_test", "retrieval_fix", "prompt_fix", "source_data_fix",
  "rule_clarification", "versioned_precedent_candidate", "rule_change_candidate", "other"
]);

let corpusPromise;
let snapshotPromise;
let archivedSnapshotPromise;

export async function handleReviewIntelligence(request, env) {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (!env.DB) return jsonResponse({ error: "Interaction logging is not configured." }, 503, origin);
  if (!env.ADMIN_TOKEN) return jsonResponse({ error: "Admin access is not configured." }, 503, origin);
  if (!await isAdminAuthorized(request, env)) return jsonResponse({ error: "Unauthorized." }, 401, origin);

  if (request.method === "GET" && url.pathname === "/api/admin/summary") {
    const results = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS count FROM rules_interactions"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rules_interactions WHERE review_status = 'unreviewed'"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rules_interactions WHERE feedback_rating IN ('unclear', 'incorrect')"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rules_interactions WHERE COALESCE(ruling_status_v2, ruling_status) = 'provisional'"),
      env.DB.prepare("SELECT COUNT(*) AS count FROM rules_interactions WHERE confidence = 'low'")
    ]);
    const provisional = countFromBatch(results[3]);
    return jsonResponse({
      total: countFromBatch(results[0]),
      unreviewed: countFromBatch(results[1]),
      negativeFeedback: countFromBatch(results[2]),
      provisional,
      unresolved: provisional,
      lowConfidence: countFromBatch(results[4])
    }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/interactions") {
    return listInteractions(env, url, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/review-intelligence") {
    const [audits, diagnostics] = await Promise.all([
      env.DB.prepare(`
        SELECT * FROM rules_interaction_audits ORDER BY reviewed_at DESC LIMIT 10000
      `).all(),
      env.DB.prepare(`
        SELECT * FROM rules_interaction_diagnostics ORDER BY created_at DESC LIMIT 10000
      `).all()
    ]);
    return jsonResponse({
      audits: (audits.results || []).map(parseAuditRow),
      diagnostics: (diagnostics.results || []).map(parseDiagnosticRow)
    }, 200, origin);
  }

  if (request.method === "GET" && url.pathname === "/api/admin/review-corpus") {
    const [current, archived] = await Promise.all([
      getCorpus(env).then(getSnapshot),
      getArchivedSnapshots(env)
    ]);
    return jsonResponse({
      currentVersion: current.version,
      current,
      byVersion: { ...archived, [current.version]: current }
    }, 200, origin);
  }

  if (request.method === "POST" && url.pathname === "/api/admin/review-audits") {
    return saveAudit(request, env, origin);
  }

  return jsonResponse({ error: "Not found." }, 404, origin);
}

async function saveAudit(request, env, origin) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Request body must be JSON." }, 400, origin);
  }

  const interactionId = String(payload?.interactionId || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(interactionId)) {
    return jsonResponse({ error: "A valid interaction ID is required." }, 400, origin);
  }
  const existing = await env.DB.prepare("SELECT id FROM rules_interactions WHERE id = ?").bind(interactionId).first();
  if (!existing) return jsonResponse({ error: "Interaction not found." }, 404, origin);

  const historicalAccuracy = String(payload?.historicalAccuracy || "indeterminate").trim();
  const currentValidity = String(payload?.currentValidity || "indeterminate").trim();
  const retrievalAssessment = String(payload?.retrievalAssessment || "not_applicable").trim();
  const classificationAssessment = String(payload?.classificationAssessment || "indeterminate").trim();
  const recommendedAction = String(payload?.recommendedAction || "none").trim();
  if (!HISTORICAL_ACCURACY.has(historicalAccuracy)) return jsonResponse({ error: "Invalid historical accuracy." }, 400, origin);
  if (!CURRENT_VALIDITY.has(currentValidity)) return jsonResponse({ error: "Invalid current validity." }, 400, origin);
  if (!RETRIEVAL_ASSESSMENT.has(retrievalAssessment)) return jsonResponse({ error: "Invalid retrieval assessment." }, 400, origin);
  if (!CLASSIFICATION_ASSESSMENT.has(classificationAssessment)) return jsonResponse({ error: "Invalid classification assessment." }, 400, origin);
  if (!RECOMMENDED_ACTIONS.has(recommendedAction)) return jsonResponse({ error: "Invalid recommended action." }, 400, origin);

  const designerReviewRequired = payload?.designerReviewRequired === true ? 1 : 0;
  const regressionCandidate = payload?.regressionCandidate === true ? 1 : 0;
  const governingSourceIds = sanitizeStringArray(payload?.governingSourceIds, 12, 100);
  const correctedAnswer = String(payload?.correctedAnswer || "").trim().slice(0, 5000);
  const sourceGap = String(payload?.sourceGap || "").trim().slice(0, 3000);
  const rationale = String(payload?.rationale || "").trim().slice(0, 5000);
  const reviewer = String(payload?.reviewer || "ChatGPT export audit").trim().slice(0, 200);
  const reviewedAgainstVersion = String(payload?.reviewedAgainstVersion || V071_RULES_VERSION).trim().slice(0, 40);
  const reviewedAgainstCorpusHash = String(payload?.reviewedAgainstCorpusHash || "").trim().slice(0, 128);
  const now = new Date().toISOString();

  const values = [
    interactionId, now, reviewer, historicalAccuracy, currentValidity, retrievalAssessment,
    classificationAssessment, designerReviewRequired, regressionCandidate, recommendedAction,
    JSON.stringify(governingSourceIds), correctedAnswer, sourceGap, rationale,
    reviewedAgainstVersion, reviewedAgainstCorpusHash
  ];

  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO rules_interaction_audits (
        interaction_id, reviewed_at, reviewer, historical_accuracy, current_validity,
        retrieval_assessment, classification_assessment, designer_review_required,
        regression_candidate, recommended_action, governing_source_ids_json,
        corrected_answer, source_gap, rationale, reviewed_against_version,
        reviewed_against_corpus_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(interaction_id) DO UPDATE SET
        reviewed_at = excluded.reviewed_at,
        reviewer = excluded.reviewer,
        historical_accuracy = excluded.historical_accuracy,
        current_validity = excluded.current_validity,
        retrieval_assessment = excluded.retrieval_assessment,
        classification_assessment = excluded.classification_assessment,
        designer_review_required = excluded.designer_review_required,
        regression_candidate = excluded.regression_candidate,
        recommended_action = excluded.recommended_action,
        governing_source_ids_json = excluded.governing_source_ids_json,
        corrected_answer = excluded.corrected_answer,
        source_gap = excluded.source_gap,
        rationale = excluded.rationale,
        reviewed_against_version = excluded.reviewed_against_version,
        reviewed_against_corpus_hash = excluded.reviewed_against_corpus_hash
    `).bind(...values),
    env.DB.prepare(`
      INSERT INTO rules_interaction_audit_history (
        id, interaction_id, reviewed_at, reviewer, historical_accuracy, current_validity,
        retrieval_assessment, classification_assessment, designer_review_required,
        regression_candidate, recommended_action, governing_source_ids_json,
        corrected_answer, source_gap, rationale, reviewed_against_version,
        reviewed_against_corpus_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(crypto.randomUUID(), ...values)
  ]);

  return jsonResponse({ ok: true }, 200, origin);
}

async function getCorpus(env) {
  if (!corpusPromise) {
    const urls = defaultV071SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run");
    corpusPromise = loadV071RulesCorpus({
      ...urls,
      fetchImpl: fetch
    }).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

async function getArchivedSnapshots(env) {
  if (!archivedSnapshotPromise) {
    archivedSnapshotPromise = Promise.all([
      loadArchivedCorpus(env, "v0.6.0")
    ]).then(async (corpora) => {
      const entries = await Promise.all(corpora.map(async (corpus) => [
        corpus.version,
        await buildCorpusReviewSnapshot(corpus)
      ]));
      return Object.fromEntries(entries);
    }).catch((error) => {
      archivedSnapshotPromise = null;
      throw error;
    });
  }
  return archivedSnapshotPromise;
}

async function loadArchivedCorpus(env, version) {
  const origin = String(env.SITE_ORIGIN || "https://gauntlet.run").replace(/\/$/, "");
  const canonicalDataUrl = `${origin}/releases/${version}/Gauntlet_${version}_Canonical_Data.json`;
  const rulebookUrl = `${origin}/releases/${version}/Gauntlet_${version}_Rulebook.md`;
  const [canonicalResponse, rulebookResponse] = await Promise.all([
    fetch(canonicalDataUrl, { cache: "no-store" }),
    fetch(rulebookUrl, { cache: "no-store" })
  ]);
  if (!canonicalResponse.ok || !rulebookResponse.ok) {
    throw new Error(`Could not load archived ${version} corpus.`);
  }
  const [canonicalData, rulebookMarkdown] = await Promise.all([
    canonicalResponse.json(),
    rulebookResponse.text()
  ]);
  return buildRulesCorpus({
    canonicalData,
    rulebookMarkdown,
    siteOrigin: origin,
    canonicalDataUrl,
    rulebookUrl,
    rulebookBrowserUrl: `${origin}/releases/${version}/Gauntlet_${version}_Rulebook.md`,
    rulebookPdfUrl: `${origin}/releases/${version}/Gauntlet_${version}_Rulebook.pdf`
  });
}

async function getSnapshot(corpus) {
  if (!snapshotPromise) {
    snapshotPromise = buildCorpusReviewSnapshot(corpus).catch((error) => {
      snapshotPromise = null;
      throw error;
    });
  }
  return snapshotPromise;
}

async function listInteractions(env, url, origin) {
  const conditions = [];
  const params = [];
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 200);
  const reviewStatus = String(url.searchParams.get("reviewStatus") || "").trim();
  const feedback = String(url.searchParams.get("feedback") || "").trim();
  const rulingStatus = String(url.searchParams.get("rulingStatus") || "").trim();
  const confidence = String(url.searchParams.get("confidence") || "").trim();
  const version = String(url.searchParams.get("version") || "").trim().slice(0, 40);
  const limit = Math.max(1, Math.min(Number(url.searchParams.get("limit")) || 50, 200));
  const offset = Math.max(0, Number(url.searchParams.get("offset")) || 0);
  if (q) { conditions.push("(question LIKE ? OR answer LIKE ?)"); params.push(`%${q}%`, `%${q}%`); }
  if (["unreviewed", "correct", "needs_correction", "rules_unclear", "duplicate"].includes(reviewStatus)) {
    conditions.push("review_status = ?"); params.push(reviewStatus);
  }
  if (["yes", "unclear", "incorrect"].includes(feedback)) {
    conditions.push("feedback_rating = ?"); params.push(feedback);
  } else if (feedback === "none") {
    conditions.push("feedback_rating IS NULL");
  }
  if (["explicit", "inferred", "provisional", "out_of_scope", "unresolved", "source_lookup"].includes(rulingStatus)) {
    conditions.push("COALESCE(ruling_status_v2, ruling_status) = ?"); params.push(rulingStatus);
  }
  if (["high", "medium", "low"].includes(confidence)) { conditions.push("confidence = ?"); params.push(confidence); }
  if (version) { conditions.push("game_version = ?"); params.push(version); }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const rows = await env.DB.prepare(`
    SELECT id, session_id, sequence_index, created_at, question, answer, game_version,
      COALESCE(ruling_status_v2, ruling_status) AS ruling_status,
      confidence, COALESCE(answer_mode_v2, answer_mode) AS answer_mode,
      model, source_count, review_status, issue_types_json, reviewer_notes, resolution,
      feedback_rating, feedback_comment, feedback_at, updated_at
    FROM rules_interactions ${where}
    ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).bind(...params, limit, offset).all();
  const count = await env.DB.prepare(`SELECT COUNT(*) AS count FROM rules_interactions ${where}`).bind(...params).first();
  return jsonResponse({
    items: (rows.results || []).map((row) => ({ ...row, issueTypes: parseJson(row.issue_types_json, []) })),
    total: Number(count?.count || 0), limit, offset
  }, 200, origin);
}

function countFromBatch(result) {
  return Number(result?.results?.[0]?.count || 0);
}

function sanitizeStringArray(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || "").trim().slice(0, maxLength)).filter(Boolean))].slice(0, maxItems);
}

function parseJson(value, fallback) {
  try {
    return JSON.parse(value || "");
  } catch {
    return fallback;
  }
}

function parseAuditRow(row) {
  return {
    ...row,
    designerReviewRequired: Boolean(row.designer_review_required),
    regressionCandidate: Boolean(row.regression_candidate),
    governingSourceIds: parseJson(row.governing_source_ids_json, [])
  };
}

function parseDiagnosticRow(row) {
  return {
    ...row,
    questionPlan: parseJson(row.question_plan_json, null),
    retrievalQueries: parseJson(row.retrieval_queries_json, []),
    candidateSources: parseJson(row.candidate_sources_json, []),
    verifier: parseJson(row.verifier_json, null),
    gameState: parseJson(row.game_state_json, null)
  };
}

function jsonResponse(value, status, origin) {
  const headers = {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (origin) headers["Access-Control-Allow-Origin"] = origin;
  return new Response(JSON.stringify(value), { status, headers });
}
