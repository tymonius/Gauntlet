export function createTriageEngine() {
  const ROOT_CAUSES = {
    conversation_continuity: {
      label: "Conversation continuity",
      recommendedAction: "Review follow-up resolution and retrieval focus across the affected conversation chain."
    },
    retrieval: {
      label: "Retrieval",
      recommendedAction: "Inspect query planning, candidate-source selection, and whether the governing rule was available but missed."
    },
    source_specificity: {
      label: "Source specificity",
      recommendedAction: "Check whether the written rule or canonical source is missing, ambiguous, or too broad for the question asked."
    },
    classification: {
      label: "Classification",
      recommendedAction: "Check explicit/inferred/provisional/out-of-scope classification against the retrieved authority."
    },
    answer_completeness: {
      label: "Answer completeness",
      recommendedAction: "Review whether the answer was materially incomplete, unclear, or failed to address the player’s actual question."
    },
    provisional_overuse: {
      label: "Provisional overuse",
      recommendedAction: "Check whether available authority should have supported a firmer ruling instead of a provisional one."
    },
    terminology_voice: {
      label: "Terminology / voice",
      recommendedAction: "Normalize terminology and explanation style without changing the underlying ruling."
    },
    other_attention: {
      label: "Other attention",
      recommendedAction: "Review the interaction manually; deterministic signals indicate risk but do not identify a stronger root-cause bucket."
    }
  };

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function ruling(row) {
    return text(row?.ruling_status_v2 || row?.ruling_status);
  }

  function confidence(row) {
    return text(row?.confidence).toLowerCase();
  }

  function reviewStatus(row) {
    return text(row?.review_status || row?.reviewStatus || "unreviewed") || "unreviewed";
  }

  function sourceCount(row) {
    const value = Number(row?.source_count);
    return Number.isFinite(value) ? Math.max(0, value) : 0;
  }

  function issueTypes(row) {
    if (Array.isArray(row?.issueTypes)) return row.issueTypes.map(text).filter(Boolean);
    if (Array.isArray(row?.issue_types)) return row.issue_types.map(text).filter(Boolean);
    if (row?.issue_types_json) {
      try {
        const parsed = JSON.parse(row.issue_types_json);
        if (Array.isArray(parsed)) return parsed.map(text).filter(Boolean);
      } catch {}
    }
    return [];
  }

  function interactionId(value) {
    return text(value?.interaction_id || value?.interactionId || value?.id);
  }

  function mapByInteraction(rows) {
    const map = new Map();
    for (const row of rows || []) {
      const id = interactionId(row);
      if (id && !map.has(id)) map.set(id, row);
    }
    return map;
  }

  function sequenceValue(row) {
    const value = Number(row?.sequence_index);
    return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
  }

  function compareConversationRows(a, b) {
    const sequence = sequenceValue(a) - sequenceValue(b);
    if (sequence) return sequence;
    const date = text(a?.created_at).localeCompare(text(b?.created_at));
    if (date) return date;
    return text(a?.id).localeCompare(text(b?.id));
  }

  function isEllipticalQuestion(question) {
    const value = text(question).toLowerCase();
    const words = value.match(/[a-z0-9']+/g) || [];
    if (!words.length || words.length > 10) return false;

    const referentCue = /\b(?:it|its|they|them|their|that|those|this|these|which|same|both|former|latter|there|then|one|ones|again|another|next|else)\b/.test(value);
    const continuationCue = /^(?:and|but|so|then|also|okay|ok|no|yes|wait|what about|how about)\b/.test(value);
    const bareQuestionCue = words.length <= 2 && /^(?:where|which|why|when|how|what|who)\b/.test(value);
    return referentCue || continuationCue || bareQuestionCue;
  }

  function candidateSourceCount(diagnostic) {
    if (!diagnostic) return null;
    const candidates = diagnostic.candidateSources || diagnostic.candidate_sources;
    if (Array.isArray(candidates)) return candidates.length;
    if (diagnostic.candidate_sources_json) {
      try {
        const parsed = JSON.parse(diagnostic.candidate_sources_json);
        return Array.isArray(parsed) ? parsed.length : null;
      } catch {}
    }
    return null;
  }

  function retrievalQueryCount(diagnostic) {
    if (!diagnostic) return 0;
    const queries = diagnostic.retrievalQueries || diagnostic.retrieval_queries;
    if (Array.isArray(queries)) return queries.length;
    if (diagnostic.retrieval_queries_json) {
      try {
        const parsed = JSON.parse(diagnostic.retrieval_queries_json);
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {}
    }
    return 0;
  }

  function auditValue(audit, camel, snake) {
    return text(audit?.[camel] ?? audit?.[snake]);
  }

  function auditBoolean(audit, camel, snake) {
    const value = audit?.[camel] ?? audit?.[snake];
    return value === true || value === 1 || text(value).toLowerCase() === "true";
  }

  function addSignal(signals, points, code, detail) {
    if (!points) return;
    signals.push({ points, code, detail });
  }

  function scoreInteraction(row, context = {}) {
    const signals = [];
    const feedback = text(row?.feedback_rating).toLowerCase();
    const conf = confidence(row);
    const status = ruling(row);
    const sources = sourceCount(row);
    const issues = issueTypes(row);
    const diagnostic = context.diagnostic || null;
    const audit = context.audit || null;
    const previous = context.previous || null;
    const sessionRows = Array.isArray(context.sessionRows) ? context.sessionRows : [];
    const elliptical = Boolean(previous) && isEllipticalQuestion(row?.question);
    const candidateCount = candidateSourceCount(diagnostic);
    const retrievalQueries = retrievalQueryCount(diagnostic);

    if (!text(row?.answer)) addSignal(signals, 50, "missing_answer", "No answer was recorded.");
    if (feedback === "incorrect") addSignal(signals, 45, "feedback_incorrect", "Player marked the answer incorrect.");
    if (feedback === "unclear") addSignal(signals, 28, "feedback_unclear", "Player marked the answer unclear.");

    if (conf === "low") addSignal(signals, 18, "low_confidence", "Answer confidence is low.");
    else if (conf === "medium") addSignal(signals, 5, "medium_confidence", "Answer confidence is medium.");

    if (status === "provisional" || status === "unresolved") {
      addSignal(signals, 12, "provisional_ruling", "Answer used a provisional ruling.");
    }
    if (status !== "out_of_scope" && sources === 0) {
      addSignal(signals, 15, "no_recorded_source", "No governing source was recorded.");
    }
    if (retrievalQueries > 0 && candidateCount === 0) {
      addSignal(signals, 12, "retrieval_no_candidates", "Retrieval ran but produced no candidate sources.");
    }

    if (issues.includes("incorrect_answer")) addSignal(signals, 40, "review_incorrect", "Review marked the answer incorrect.");
    if (issues.includes("retrieval_failure")) addSignal(signals, 35, "review_retrieval_failure", "Review identified a retrieval failure.");
    if (issues.includes("missing_rule")) addSignal(signals, 25, "review_missing_rule", "Review identified a missing rule.");
    if (issues.includes("ambiguous_rule")) addSignal(signals, 20, "review_ambiguous_rule", "Review identified an ambiguous rule.");
    if (issues.includes("inconsistent_terminology")) addSignal(signals, 15, "review_terminology", "Review identified inconsistent terminology.");
    if (issues.includes("unclear_explanation")) addSignal(signals, 12, "review_unclear_explanation", "Review identified an unclear explanation.");

    const historicalAccuracy = auditValue(audit, "historicalAccuracy", "historical_accuracy");
    const retrievalAssessment = auditValue(audit, "retrievalAssessment", "retrieval_assessment");
    const classificationAssessment = auditValue(audit, "classificationAssessment", "classification_assessment");
    const recommendedAction = auditValue(audit, "recommendedAction", "recommended_action");
    const designerReviewRequired = auditBoolean(audit, "designerReviewRequired", "designer_review_required");
    if (historicalAccuracy === "incorrect") addSignal(signals, 40, "audit_incorrect", "Audit found the historical answer incorrect.");
    if (retrievalAssessment === "failure") addSignal(signals, 35, "audit_retrieval_failure", "Audit found retrieval failed.");
    else if (retrievalAssessment === "weak") addSignal(signals, 16, "audit_retrieval_weak", "Audit found retrieval weak.");
    if (classificationAssessment && !["correct", "indeterminate", "not_applicable"].includes(classificationAssessment)) {
      addSignal(signals, 20, "audit_classification", "Audit recommends a different ruling classification.");
    }
    if (designerReviewRequired) addSignal(signals, 15, "designer_review_required", "Audit requires designer review before the issue is considered closed.");

    if (elliptical) addSignal(signals, 12, "elliptical_followup", "Short or referential follow-up depends on prior conversation context.");
    const fragileFollowup = elliptical && (conf === "low" || status === "provisional" || status === "unresolved" || sources === 0 || feedback === "incorrect" || feedback === "unclear");
    if (fragileFollowup) addSignal(signals, 15, "fragile_followup", "Context-dependent follow-up also shows a retrieval or answer-risk signal.");

    if (previous && ["incorrect", "unclear"].includes(text(previous.feedback_rating).toLowerCase())) {
      addSignal(signals, 10, "preceded_by_negative_feedback", "The previous turn in this conversation received negative feedback.");
    }
    const unresolvedInSession = sessionRows.filter((item) => {
      const itemStatus = ruling(item);
      return itemStatus === "provisional" || itemStatus === "unresolved" || ["incorrect", "unclear"].includes(text(item?.feedback_rating).toLowerCase());
    }).length;
    if (unresolvedInSession >= 2) addSignal(signals, 8, "repeated_session_risk", "Multiple turns in this conversation show unresolved or negative signals.");

    if ((status === "provisional" || status === "unresolved") && sources > 0 && conf !== "low") {
      addSignal(signals, 8, "provisional_with_authority", "A provisional ruling was returned despite recorded authority and non-low confidence.");
    }
    if (recommendedAction === "source_data_fix") addSignal(signals, 18, "audit_source_data", "Audit recommends a source-data fix.");
    if (recommendedAction === "retrieval_fix") addSignal(signals, 18, "audit_retrieval_fix", "Audit recommends a retrieval fix.");
    if (recommendedAction === "rule_clarification") addSignal(signals, 18, "audit_rule_clarification", "Audit recommends clarifying the written rule.");
    if (recommendedAction === "prompt_fix") addSignal(signals, 12, "audit_prompt", "Audit recommends a prompt fix.");
    if (recommendedAction === "versioned_precedent_candidate") addSignal(signals, 12, "audit_precedent", "Audit identified a versioned precedent candidate requiring review.");
    if (recommendedAction === "rule_change_candidate") addSignal(signals, 12, "audit_rule_change", "Audit identified a rule-change candidate requiring review.");

    const score = Math.min(100, signals.reduce((total, signal) => total + signal.points, 0));
    const priority = score >= 50 ? "high" : score >= 25 ? "medium" : score >= 10 ? "low" : "routine";
    return { score, priority, signals, elliptical, fragileFollowup, candidateSourceCount: candidateCount };
  }

  function classifyRootCause(row, context, score) {
    const issues = issueTypes(row);
    const audit = context.audit || null;
    const diagnostic = context.diagnostic || null;
    const status = ruling(row);
    const conf = confidence(row);
    const sources = sourceCount(row);
    const feedback = text(row?.feedback_rating).toLowerCase();
    const retrievalAssessment = auditValue(audit, "retrievalAssessment", "retrieval_assessment");
    const classificationAssessment = auditValue(audit, "classificationAssessment", "classification_assessment");
    const recommendedAction = auditValue(audit, "recommendedAction", "recommended_action");
    const candidateCount = candidateSourceCount(diagnostic);
    const retrievalQueries = retrievalQueryCount(diagnostic);

    if (issues.includes("inconsistent_terminology")) return "terminology_voice";
    if (issues.includes("missing_rule") || issues.includes("ambiguous_rule") || ["source_data_fix", "rule_clarification", "versioned_precedent_candidate", "rule_change_candidate"].includes(recommendedAction)) return "source_specificity";
    if (recommendedAction === "retrieval_fix") return "retrieval";
    if (score.elliptical && context.previous && (score.fragileFollowup || ["incorrect", "unclear"].includes(feedback))) return "conversation_continuity";
    if ((classificationAssessment && !["correct", "indeterminate", "not_applicable"].includes(classificationAssessment)) || issues.includes("uncovered_interaction")) return "classification";
    if ((status === "provisional" || status === "unresolved") && sources > 0 && conf !== "low") return "provisional_overuse";
    if (issues.includes("retrieval_failure") || recommendedAction === "retrieval_fix" || ["weak", "failure"].includes(retrievalAssessment) || (status !== "out_of_scope" && sources === 0) || (retrievalQueries > 0 && candidateCount === 0)) return "retrieval";
    if (feedback === "unclear" || issues.includes("unclear_explanation")) return "answer_completeness";
    return "other_attention";
  }

  function triageInteractions(rows, intelligence = {}, options = {}) {
    const interactions = Array.isArray(rows) ? rows.slice() : [];
    const scope = text(options?.scope) === "reviewed_backlog" ? "reviewed_backlog" : "unreviewed";
    const diagnosticMap = mapByInteraction(intelligence.diagnostics || []);
    const auditMap = mapByInteraction(intelligence.audits || []);
    const sessions = new Map();

    for (const row of interactions) {
      const sessionId = text(row?.session_id);
      if (!sessionId) continue;
      if (!sessions.has(sessionId)) sessions.set(sessionId, []);
      sessions.get(sessionId).push(row);
    }
    for (const sessionRows of sessions.values()) sessionRows.sort(compareConversationRows);

    const unreviewedCount = interactions.filter((row) => reviewStatus(row) === "unreviewed").length;
    const scored = [];
    for (const row of interactions) {
      const currentReviewStatus = reviewStatus(row);
      if (scope === "unreviewed" && currentReviewStatus !== "unreviewed") continue;
      if (scope === "reviewed_backlog" && currentReviewStatus === "unreviewed") continue;

      const id = text(row?.id || row?.interactionId);
      if (!id) continue;
      const sessionRows = sessions.get(text(row?.session_id)) || [];
      const index = sessionRows.findIndex((candidate) => text(candidate?.id) === id);
      const previous = index > 0 ? sessionRows[index - 1] : null;
      const context = {
        previous,
        sessionRows,
        diagnostic: diagnosticMap.get(id) || null,
        audit: auditMap.get(id) || null
      };
      const scoring = scoreInteraction(row, context);
      if (scope === "reviewed_backlog" && scoring.score < 10) continue;
      const rootCause = classifyRootCause(row, context, scoring);
      scored.push({
        interactionId: id,
        createdAt: text(row?.created_at),
        question: text(row?.question),
        reviewStatus: currentReviewStatus,
        score: scoring.score,
        priority: scoring.priority,
        rootCause,
        rootCauseLabel: ROOT_CAUSES[rootCause].label,
        reasons: scoring.signals.sort((a, b) => b.points - a.points).map((signal) => signal.detail),
        signalCodes: scoring.signals.map((signal) => signal.code)
      });
    }

    scored.sort((a, b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt) || a.interactionId.localeCompare(b.interactionId));
    const attention = scored.filter((item) => item.score >= 10);
    const clusterMap = new Map();
    for (const item of attention) {
      if (!clusterMap.has(item.rootCause)) clusterMap.set(item.rootCause, []);
      clusterMap.get(item.rootCause).push(item);
    }

    const clusters = [...clusterMap.entries()].map(([rootCause, items]) => {
      const scores = items.map((item) => item.score);
      return {
        rootCause,
        label: ROOT_CAUSES[rootCause].label,
        count: items.length,
        highCount: items.filter((item) => item.priority === "high").length,
        mediumCount: items.filter((item) => item.priority === "medium").length,
        maxScore: Math.max(...scores),
        averageScore: Math.round(scores.reduce((sum, value) => sum + value, 0) / items.length),
        interactionIds: items.map((item) => item.interactionId),
        representatives: items.slice(0, 3).map((item) => ({
          interactionId: item.interactionId,
          question: item.question,
          score: item.score,
          priority: item.priority,
          reasons: item.reasons.slice(0, 3)
        })),
        recommendedAction: ROOT_CAUSES[rootCause].recommendedAction
      };
    }).sort((a, b) => b.highCount - a.highCount || b.maxScore - a.maxScore || b.count - a.count || a.label.localeCompare(b.label));

    return {
      schema: "gauntlet.rules-triage.v1",
      generatedAt: new Date().toISOString(),
      scope,
      stats: {
        scope,
        eligible: scored.length,
        unreviewed: unreviewedCount,
        reviewedBacklog: scope === "reviewed_backlog" ? scored.length : 0,
        high: scored.filter((item) => item.priority === "high").length,
        medium: scored.filter((item) => item.priority === "medium").length,
        low: scored.filter((item) => item.priority === "low").length,
        routine: scored.filter((item) => item.priority === "routine").length,
        attention: attention.length,
        clusters: clusters.length
      },
      clusters,
      interactions: scored
    };
  }

  return { ROOT_CAUSES, scoreInteraction, triageInteractions, isEllipticalQuestion };
}

export const refinementTriage = createTriageEngine();