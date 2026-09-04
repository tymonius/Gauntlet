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

    if (["explicit", "inferred"].includes(item.expectedClassification) && !(item.expectedSourcePatterns || []).length) {
      failures.push(`benchmark: ${item.id} expects ${item.expectedClassification} without a governing source pattern`);
    }

    if (item.classificationBasis === "direct-authority" && item.expectedClassification !== "explicit") {
      failures.push(`benchmark: ${item.id} marks direct authority but does not expect explicit`);
    }

    if (item.classificationBasis === "combined-authority") {
      if (item.expectedClassification !== "inferred") {
        failures.push(`benchmark: ${item.id} marks combined authority but does not expect inferred`);
      }
      if ((item.expectedSourcePatterns || []).length < 2) {
        failures.push(`benchmark: ${item.id} marks combined authority without multiple governing source patterns`);
      }
    }
  }

  return failures;
}
