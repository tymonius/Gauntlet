import { refinementTriage } from "./refinement-triage.js";
import { applyRefinementResolutionLedger } from "./refinement-resolution-ledger.js";
import { applyCurrentValidityToRefinementReport } from "./refinement-current-validity.js";

export const REFINEMENT_SNAPSHOT_SCHEMA = "gauntlet.rules-refinement-snapshot.v1";

function text(value) {
  return String(value == null ? "" : value).trim();
}

function count(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sanitizeInteraction(item) {
  return {
    interactionId: text(item?.interactionId),
    createdAt: text(item?.createdAt),
    reviewStatus: text(item?.reviewStatus),
    score: count(item?.score),
    priority: text(item?.priority),
    rootCause: text(item?.rootCause),
    rootCauseLabel: text(item?.rootCauseLabel),
    signalCodes: Array.isArray(item?.signalCodes) ? item.signalCodes.map(text).filter(Boolean) : [],
    reasons: Array.isArray(item?.reasons) ? item.reasons.map(text).filter(Boolean) : []
  };
}

function sanitizeCluster(cluster) {
  return {
    rootCause: text(cluster?.rootCause),
    label: text(cluster?.label),
    count: count(cluster?.count),
    highCount: count(cluster?.highCount),
    mediumCount: count(cluster?.mediumCount),
    maxScore: count(cluster?.maxScore),
    averageScore: count(cluster?.averageScore),
    interactionIds: Array.isArray(cluster?.interactionIds) ? cluster.interactionIds.map(text).filter(Boolean) : [],
    recommendedAction: text(cluster?.recommendedAction)
  };
}

function sanitizeHistoricalOnly(item) {
  return {
    interactionId: text(item?.interactionId),
    currentValidity: text(item?.currentValidity),
    reviewedAgainstVersion: text(item?.reviewedAgainstVersion),
    historicalAccuracy: text(item?.historicalAccuracy),
    recommendedAction: text(item?.recommendedAction)
  };
}

function sanitizeResolved(item) {
  return {
    interactionId: text(item?.interactionId),
    currentRootCause: text(item?.currentRootCause),
    resolutionId: text(item?.resolutionId),
    resolutionRootCause: text(item?.resolutionRootCause),
    resolutionSurface: text(item?.resolutionSurface),
    resolvedAt: text(item?.resolvedAt)
  };
}

export function createPrivacySafeRefinementSnapshot(report, sourceStats = {}) {
  const interactions = Array.isArray(report?.interactions) ? report.interactions.map(sanitizeInteraction) : [];
  const historicalOnly = Array.isArray(report?.historicalOnly) ? report.historicalOnly.map(sanitizeHistoricalOnly) : [];
  const resolvedByRefinement = Array.isArray(report?.resolvedByRefinement) ? report.resolvedByRefinement.map(sanitizeResolved) : [];
  const clusters = Array.isArray(report?.clusters) ? report.clusters.map(sanitizeCluster) : [];

  return {
    schema: REFINEMENT_SNAPSHOT_SCHEMA,
    generatedAt: new Date().toISOString(),
    scope: text(report?.scope),
    sourceRows: {
      interactions: count(sourceStats?.interactions),
      diagnostics: count(sourceStats?.diagnostics),
      audits: count(sourceStats?.audits)
    },
    stats: { ...(report?.stats || {}) },
    resolutionLedger: report?.resolutionLedger ? {
      schema: text(report.resolutionLedger.schema),
      updatedAt: text(report.resolutionLedger.updatedAt),
      entries: count(report.resolutionLedger.entries),
      resolvedInteractionIds: count(report.resolutionLedger.resolvedInteractionIds)
    } : null,
    clusters,
    interactions,
    historicalOnly,
    resolvedByRefinement
  };
}

export function buildPrivacySafeReviewedBacklogSnapshot({ interactions = [], diagnostics = [], audits = [] } = {}) {
  const triaged = refinementTriage.triageInteractions(
    interactions,
    { diagnostics, audits },
    { scope: "reviewed_backlog" }
  );
  const afterLedger = applyRefinementResolutionLedger(triaged);
  const current = applyCurrentValidityToRefinementReport(afterLedger, audits);
  return createPrivacySafeRefinementSnapshot(current, {
    interactions: interactions.length,
    diagnostics: diagnostics.length,
    audits: audits.length
  });
}
