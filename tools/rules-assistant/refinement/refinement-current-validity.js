const HISTORICAL_ONLY_VALIDITY = new Set(["stale", "superseded", "not_applicable"]);

function text(value) {
  return String(value == null ? "" : value).trim();
}

function interactionId(value) {
  return text(value?.interaction_id || value?.interactionId || value?.id);
}

function currentValidity(audit) {
  return text(audit?.currentValidity ?? audit?.current_validity).toLowerCase();
}

function reviewedAgainstVersion(audit) {
  return text(audit?.reviewedAgainstVersion ?? audit?.reviewed_against_version);
}

function mapAudits(rows) {
  const map = new Map();
  for (const row of rows || []) {
    const id = interactionId(row);
    if (id && !map.has(id)) map.set(id, row);
  }
  return map;
}

function rebuildClusters(clusters, interactions) {
  const interactionMap = new Map(interactions.map((item) => [text(item?.interactionId), item]));
  const rebuilt = [];
  for (const cluster of clusters || []) {
    const ids = (cluster?.interactionIds || []).map(text).filter((id) => interactionMap.has(id));
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
  return rebuilt.sort((a, b) =>
    Number(b.highCount || 0) - Number(a.highCount || 0)
    || Number(b.maxScore || 0) - Number(a.maxScore || 0)
    || Number(b.count || 0) - Number(a.count || 0)
    || text(a.label).localeCompare(text(b.label))
  );
}

export function applyCurrentValidityToRefinementReport(report, audits = []) {
  const baseStats = report?.stats && typeof report.stats === "object" ? report.stats : {};
  if (text(report?.scope) !== "reviewed_backlog") {
    return {
      ...report,
      stats: { ...baseStats, historicalOnly: 0 },
      historicalOnly: []
    };
  }

  const auditMap = mapAudits(audits);
  const interactions = Array.isArray(report?.interactions) ? report.interactions : [];
  const active = [];
  const historicalOnly = [];

  for (const item of interactions) {
    const id = text(item?.interactionId);
    const audit = auditMap.get(id);
    const validity = currentValidity(audit);
    if (!HISTORICAL_ONLY_VALIDITY.has(validity)) {
      active.push(item);
      continue;
    }
    historicalOnly.push({
      interactionId: id,
      currentValidity: validity,
      reviewedAgainstVersion: reviewedAgainstVersion(audit),
      historicalAccuracy: text(audit?.historicalAccuracy ?? audit?.historical_accuracy),
      recommendedAction: text(audit?.recommendedAction ?? audit?.recommended_action)
    });
  }

  const clusters = rebuildClusters(report?.clusters || [], active);
  return {
    ...report,
    stats: {
      ...baseStats,
      eligible: active.length,
      reviewedBacklog: active.length,
      high: active.filter((item) => item?.priority === "high").length,
      medium: active.filter((item) => item?.priority === "medium").length,
      low: active.filter((item) => item?.priority === "low").length,
      routine: active.filter((item) => item?.priority === "routine").length,
      attention: active.filter((item) => Number(item?.score || 0) >= 10).length,
      clusters: clusters.length,
      historicalOnly: historicalOnly.length
    },
    clusters,
    interactions: active,
    historicalOnly
  };
}

export const refinementCurrentValidity = {
  historicalOnlyStatuses: [...HISTORICAL_ONLY_VALIDITY],
  apply: applyCurrentValidityToRefinementReport
};
