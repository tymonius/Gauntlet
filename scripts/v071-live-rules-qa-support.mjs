const VALID_CLASSIFICATIONS = new Set(["explicit", "inferred", "provisional", "out_of_scope"]);

export function normalizeQaText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[–—]/g, "-")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceText(source) {
  return normalizeQaText([
    source?.title,
    source?.excerpt,
    source?.sourcePath,
    source?.canonicalId,
    source?.id
  ].filter(Boolean).join("\n"));
}

export function significantTopicTerms(value) {
  return String(value || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2 && !["the", "and", "that", "this", "does", "work"].includes(term));
}

export function buildContinuityText(answer, sources = []) {
  return normalizeQaText([
    answer,
    ...sources.map((source) => sourceText(source))
  ].join("\n"));
}

export function applyBenchmarkCorrections(benchmark, corrections) {
  if (!corrections || corrections.rulesVersion !== benchmark.rulesVersion) {
    throw new Error("Live QA benchmark corrections do not match the benchmark rules version.");
  }

  const byId = new Map((corrections.cases || []).map((item) => [item.id, item]));
  const knownIds = new Set((benchmark.cases || []).map((item) => item.id));
  for (const id of byId.keys()) {
    if (!knownIds.has(id)) throw new Error(`Live QA benchmark correction references unknown case ${id}.`);
  }

  return {
    ...benchmark,
    cases: (benchmark.cases || []).map((item) => ({
      ...item,
      ...(byId.get(item.id) || {})
    }))
  };
}

export function sourceRequirementGroups(item) {
  const legacy = Array.isArray(item?.expectedSourcePatterns)
    ? item.expectedSourcePatterns.map((pattern) => [pattern])
    : [];
  const alternatives = Array.isArray(item?.expectedSourceGroups)
    ? item.expectedSourceGroups
    : [];
  return [...legacy, ...alternatives];
}

function validateSourceRequirementShape(item, failures) {
  if (item.expectedSourcePatterns !== undefined && !Array.isArray(item.expectedSourcePatterns)) {
    failures.push(`benchmark: ${item.id} expectedSourcePatterns must be an array`);
  }
  if (item.expectedSourceGroups !== undefined && !Array.isArray(item.expectedSourceGroups)) {
    failures.push(`benchmark: ${item.id} expectedSourceGroups must be an array of nonempty pattern arrays`);
    return;
  }

  for (const [index, group] of (item.expectedSourceGroups || []).entries()) {
    if (!Array.isArray(group) || !group.length) {
      failures.push(`benchmark: ${item.id} source group ${index + 1} must be a nonempty array`);
      continue;
    }
    if (group.some((pattern) => typeof pattern !== "string" || !pattern.trim())) {
      failures.push(`benchmark: ${item.id} source group ${index + 1} contains an empty or non-string pattern`);
    }
  }

  if ((item.expectedSourcePatterns || []).some((pattern) => typeof pattern !== "string" || !pattern.trim())) {
    failures.push(`benchmark: ${item.id} expectedSourcePatterns contains an empty or non-string pattern`);
  }
}

export function validateClassificationExpectations(benchmark) {
  const failures = [];
  const seenIds = new Set();

  for (const item of benchmark.cases || []) {
    if (!item.id) {
      failures.push("benchmark: case is missing an id");
      continue;
    }
    if (seenIds.has(item.id)) failures.push(`benchmark: duplicate case id ${item.id}`);
    seenIds.add(item.id);

    if (!VALID_CLASSIFICATIONS.has(item.expectedClassification)) {
      failures.push(`benchmark: ${item.id} has invalid expected classification ${item.expectedClassification || "missing"}`);
    }

    validateSourceRequirementShape(item, failures);
    const sourceGroups = sourceRequirementGroups(item);

    if (["explicit", "inferred"].includes(item.expectedClassification) && !sourceGroups.length) {
      failures.push(`benchmark: ${item.id} expects ${item.expectedClassification} without a governing source requirement`);
    }

    if (item.classificationBasis === "direct-authority" && item.expectedClassification !== "explicit") {
      failures.push(`benchmark: ${item.id} marks direct authority but does not expect explicit`);
    }

    if (item.classificationBasis === "combined-authority") {
      if (item.expectedClassification !== "inferred") {
        failures.push(`benchmark: ${item.id} marks combined authority but does not expect inferred`);
      }
      if (sourceGroups.length < 2) {
        failures.push(`benchmark: ${item.id} marks combined authority without multiple governing source requirements`);
      }
    }
  }

  return failures;
}


export function classifyTransportInfrastructure(status, responseText = "", payload = null) {
  const httpStatus = Number(status);
  if (!Number.isInteger(httpStatus) || httpStatus < 500) return null;
  const plainText = String(responseText || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const cloudflareCode = plainText.match(/Error\s*code:\s*(\d{4})/i)?.[1] || null;
  const workerCode = String(payload?.errorCode || "").trim();
  const details = [cloudflareCode ? `Cloudflare error ${cloudflareCode}` : "", workerCode].filter(Boolean);
  return `infrastructure: production endpoint HTTP ${httpStatus}${details.length ? ` (${details.join(", ")})` : ""}`;
}
