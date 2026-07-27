export const REVIEW_BUNDLE_SCHEMA = "gauntlet.rules-review-bundle.v1";

export const REVIEW_STATUSES = [
  "unreviewed",
  "correct",
  "needs_correction",
  "rules_unclear",
  "duplicate"
];

export const REVIEW_ISSUE_TYPES = [
  "incorrect_answer",
  "missing_rule",
  "ambiguous_rule",
  "inconsistent_terminology",
  "uncovered_interaction",
  "unclear_explanation",
  "retrieval_failure",
  "duplicate"
];

export const REVIEW_RESOLUTIONS = [
  "",
  "no_action",
  "prompt_fix",
  "retrieval_fix",
  "source_data_fix",
  "rule_rewrite",
  "faq_addition",
  "other"
];

export function buildReviewBundle({ interactions, sources, filters, matchedCount, exportedAt = new Date().toISOString() }) {
  const sourceMap = new Map();
  for (const source of sources || []) {
    const key = String(source.interaction_id || "");
    if (!sourceMap.has(key)) sourceMap.set(key, []);
    sourceMap.get(key).push({
      sourceId: String(source.source_id || ""),
      title: String(source.title || "Canonical source"),
      sourcePath: String(source.source_path || ""),
      sourceUrl: String(source.source_url || ""),
      excerpt: String(source.excerpt || "")
    });
  }

  const sanitized = (interactions || []).map((row) => ({
    interactionId: String(row.id || ""),
    createdAt: String(row.created_at || ""),
    question: String(row.question || ""),
    answer: String(row.answer || ""),
    gameVersion: String(row.game_version || ""),
    rulingStatus: String(row.ruling_status || ""),
    confidence: String(row.confidence || ""),
    answerMode: String(row.answer_mode || ""),
    model: row.model == null ? null : String(row.model),
    playerFeedback: row.feedback_rating ? {
      rating: String(row.feedback_rating),
      comment: String(row.feedback_comment || "")
    } : null,
    currentReview: {
      status: String(row.review_status || "unreviewed"),
      issueTypes: parseIssueTypes(row.issueTypes || row.issue_types_json),
      reviewerNotes: String(row.reviewer_notes || ""),
      resolution: String(row.resolution || "")
    },
    sources: sourceMap.get(String(row.id || "")) || []
  }));

  const total = Number(matchedCount || 0);
  return {
    schema: REVIEW_BUNDLE_SCHEMA,
    exportedAt,
    game: "Gauntlet",
    rulesVersionScope: [...new Set(sanitized.map((item) => item.gameVersion).filter(Boolean))],
    scope: {
      source: "Live website Rules Arbiter interactions",
      filters: filters || {},
      matchedInteractions: total,
      includedInteractions: sanitized.length,
      truncated: sanitized.length < total
    },
    privacy: {
      omitted: [
        "anonymous session identifiers",
        "previous-interaction links",
        "raw IP addresses",
        "OpenAI safety identifiers",
        "review-history row identifiers"
      ],
      note: "The bundle contains player-submitted questions, generated answers, optional feedback, review fields, and exact cited source excerpts."
    },
    reviewTask: {
      instructions: [
        "Review only from the question, answer, exact source excerpts, and existing review fields supplied in this bundle.",
        "Do not use prior Gauntlet conversations, old rules versions, or outside assumptions to fill a source gap.",
        "For each interaction, determine whether the answer is supported, accurate, sufficiently clear, and appropriately labeled as explicit, inferred, or unresolved.",
        "Return one recommendation per interactionId using only the allowed reviewStatus, issueTypes, and resolution values below.",
        "Keep reviewerNotes concise but specific enough to explain the judgment and identify any needed rule, retrieval, source-data, prompt, or FAQ change."
      ],
      responseShape: {
        recommendations: [{
          interactionId: "UUID from the bundle",
          reviewStatus: "one allowed review status",
          issueTypes: ["zero or more allowed issue types"],
          reviewerNotes: "specific explanation",
          resolution: "one allowed resolution"
        }],
        crossInteractionFindings: [{
          pattern: "recurring issue or opportunity",
          affectedInteractionIds: ["UUID"],
          recommendedAction: "concrete next step"
        }]
      },
      allowedValues: {
        reviewStatus: REVIEW_STATUSES,
        issueTypes: REVIEW_ISSUE_TYPES,
        resolution: REVIEW_RESOLUTIONS
      }
    },
    interactions: sanitized
  };
}

function parseIssueTypes(value) {
  if (Array.isArray(value)) return value.map(String);
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}
