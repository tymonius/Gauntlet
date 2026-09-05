import ledgerData from "../artifacts/rules-refinement/resolution-ledger.json" with { type: "json" };

export const REFINEMENT_RESOLUTION_LEDGER_SCHEMA = "gauntlet.rules-refinement-resolution-ledger.v1";
export const refinementResolutionLedger = ledgerData;

function text(value) {
  return String(value == null ? "" : value).trim();
}

function list(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function bindingValue(binding) {
  if (!binding || typeof binding !== "object") return false;
  return Boolean(
    text(binding.authoritySetId)
    || text(binding.behaviorRevision)
    || text(binding.commit)
  );
}

export function validateRefinementResolutionLedger(ledger = refinementResolutionLedger) {
  const failures = [];
  if (!ledger || ledger.schema !== REFINEMENT_RESOLUTION_LEDGER_SCHEMA || !Array.isArray(ledger.entries)) {
    return {
      ok: false,
      failures: ["Resolution ledger must use gauntlet.rules-refinement-resolution-ledger.v1 and contain an entries array."],
      resolvedInteractionCount: 0
    };
  }

  const entryIds = new Set();
  const resolvedInteractionIds = new Map();
  for (const entry of ledger.entries) {
    const id = text(entry?.id);
    if (!id) failures.push("Every resolution entry requires a stable id.");
    else if (entryIds.has(id)) failures.push(`Duplicate resolution entry id: ${id}.`);
    else entryIds.add(id);

    const status = text(entry?.status);
    if (!["pending", "resolved", "superseded"].includes(status)) {
      failures.push(`Resolution ${id || "(unnamed)"} has unsupported status ${status || "(blank)"}.`);
    }

    const interactionIds = list(entry?.interactionIds);
    if (status === "resolved") {
      if (!interactionIds.length) failures.push(`Resolved entry ${id || "(unnamed)"} must record at least one interaction ID.`);
      if (!text(entry?.rootCause)) failures.push(`Resolved entry ${id || "(unnamed)"} must record its root cause.`);
      if (!text(entry?.resolutionSurface)) failures.push(`Resolved entry ${id || "(unnamed)"} must record its resolution surface.`);
      if (!text(entry?.summary)) failures.push(`Resolved entry ${id || "(unnamed)"} must summarize the systemic fix.`);
      if (!text(entry?.resolvedAt)) failures.push(`Resolved entry ${id || "(unnamed)"} must record when the refinement was resolved.`);
      if (!bindingValue(entry?.binding)) {
        failures.push(`Resolved entry ${id || "(unnamed)"} must bind to an authoritySetId, behaviorRevision, or fix commit.`);
      }
      for (const interactionId of interactionIds) {
        const existing = resolvedInteractionIds.get(interactionId);
        if (existing) failures.push(`Interaction ${interactionId} is resolved by both ${existing} and ${id || "(unnamed)"}.`);
        else resolvedInteractionIds.set(interactionId, id || "(unnamed)");
      }
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    resolvedInteractionCount: resolvedInteractionIds.size
  };
}

export function indexResolvedRefinements(ledger = refinementResolutionLedger) {
  const validation = validateRefinementResolutionLedger(ledger);
  if (!validation.ok) throw new Error(`Invalid Rules Arbiter refinement resolution ledger: ${validation.failures.join(" ")}`);
  const byInteractionId = new Map();
  for (const entry of ledger.entries) {
    if (text(entry?.status) !== "resolved") continue;
    for (const interactionId of list(entry?.interactionIds)) byInteractionId.set(interactionId, entry);
  }
  return byInteractionId;
}

function rebuildClusters(clusters, interactions) {
  const interactionMap = new Map(interactions.map((item) => [text(item?.interactionId), item]));
  const rebuilt = [];
  for (const cluster of clusters || []) {
    const ids = list(cluster?.interactionIds).filter((id) => interactionMap.has(id));
    if (!ids.length) continue;
    const items = ids.map((id) => interactionMap.get(id)).filter(Boolean);
    const scores = items.map((item) => Number(item?.score || 0));
    rebuilt.push({
      ...cluster,
      count: items.length,
      highCount: items.filter((item) => item?.priority === "high").length,
      mediumCount: items.filter((item) => item?.priority === "medium").length,
      maxScore: Math.max(...scores),
      averageScore: Math.round(scores.reduce((sum, value) => sum + value, 0) / items.length),
      interactionIds: ids,
      representatives: items.slice(0, 3).map((item) => ({
        interactionId: item.interactionId,
        question: item.question,
        score: item.score,
        priority: item.priority,
        reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 3) : []
      }))
    });
  }
  return rebuilt;
}

export function applyRefinementResolutionLedger(report, ledger = refinementResolutionLedger) {
  const resolved = indexResolvedRefinements(ledger);
  const baseStats = report?.stats && typeof report.stats === "object" ? report.stats : {};
  const base = {
    ...report,
    resolutionLedger: {
      schema: ledger.schema,
      updatedAt: text(ledger.updatedAt),
      entries: ledger.entries.length,
      resolvedInteractionIds: resolved.size
    },
    resolvedByRefinement: []
  };

  if (text(report?.scope) !== "reviewed_backlog") {
    return {
      ...base,
      stats: { ...baseStats, resolvedByRefinement: 0 }
    };
  }

  const interactions = Array.isArray(report?.interactions) ? report.interactions : [];
  const matched = [];
  const unresolved = [];
  for (const item of interactions) {
    const interactionId = text(item?.interactionId);
    const entry = resolved.get(interactionId);
    if (!entry) {
      unresolved.push(item);
      continue;
    }
    matched.push({
      interactionId,
      currentRootCause: text(item?.rootCause),
      resolutionId: text(entry.id),
      resolutionRootCause: text(entry.rootCause),
      resolutionSurface: text(entry.resolutionSurface),
      summary: text(entry.summary),
      resolvedAt: text(entry.resolvedAt),
      binding: entry.binding || null
    });
  }

  const clusters = rebuildClusters(report?.clusters || [], unresolved);
  const stats = {
    ...baseStats,
    eligible: unresolved.length,
    reviewedBacklog: unresolved.length,
    high: unresolved.filter((item) => item?.priority === "high").length,
    medium: unresolved.filter((item) => item?.priority === "medium").length,
    low: unresolved.filter((item) => item?.priority === "low").length,
    routine: unresolved.filter((item) => item?.priority === "routine").length,
    attention: unresolved.filter((item) => Number(item?.score || 0) >= 10).length,
    clusters: clusters.length,
    resolvedByRefinement: matched.length
  };

  return {
    ...base,
    stats,
    clusters,
    interactions: unresolved,
    resolvedByRefinement: matched
  };
}
