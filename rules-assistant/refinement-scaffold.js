export function createRefinementScaffoldEngine() {
  const TARGETS = {
    conversation_continuity: {
      likelyFiles: ["rules-assistant/local-search.js", "rules-assistant/worker-v071.js"],
      deterministicChecks: [
        "npx vitest run rules-assistant/refinement-loop.test.mjs rules-assistant/refinement-triage.test.mjs",
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    retrieval: {
      likelyFiles: ["rules-assistant/local-search.js", "rules-assistant/worker-v071.js"],
      deterministicChecks: [
        "npx vitest run rules-assistant/refinement-loop.test.mjs",
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    source_specificity: {
      likelyFiles: ["rules-assistant/v071-public-corpus.js", "rules-assistant/Rules_Arbiter_Adjudication_Guide.md"],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    classification: {
      likelyFiles: ["rules-assistant/worker-v071.js", "rules-assistant/reliable-worker.js"],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    answer_completeness: {
      likelyFiles: ["rules-assistant/worker-v071.js"],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    provisional_overuse: {
      likelyFiles: ["rules-assistant/worker-v071.js", "rules-assistant/reliable-worker.js"],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    terminology_voice: {
      likelyFiles: ["rules-assistant/worker-v071.js", "rules-assistant/Rules_Arbiter_Adjudication_Guide.md"],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    },
    other_attention: {
      likelyFiles: [],
      deterministicChecks: [
        "npx vitest related --run --passWithNoTests rules-assistant/evals/rules-arbiter-evals.v071.json"
      ]
    }
  };

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function slug(value) {
    return text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "attention";
  }

  function dateStamp(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}${match[2]}${match[3]}` : new Date().toISOString().slice(0, 10).replace(/-/g, "");
  }

  function validateReport(report) {
    if (!report || report.schema !== "gauntlet.rules-triage.v1" || !Array.isArray(report.clusters) || !Array.isArray(report.interactions)) {
      throw new Error("Triage input must use gauntlet.rules-triage.v1.");
    }
  }

  function publicPrBody(scaffold, regression = null, baseline = null) {
    const cluster = scaffold.cluster;
    const regressionLine = regression
      ? `Regression fixtures: ${regression.readyCount} ready, ${regression.alreadyCoveredCount} already covered, ${regression.manualCount} needing manual fixture work.`
      : "Regression fixtures: attach the reviewed regression-candidate bundle before implementation.";
    const baselineLine = baseline
      ? `Deterministic baseline: ${baseline.result.toUpperCase()} (${baseline.command}).`
      : "Deterministic baseline: run by the materialization script after regression fixtures are applied.";
    return [
      `Addresses the deterministic Rules Arbiter **${scaffold.label}** cluster.`,
      "",
      `- affected interactions: ${cluster.count}`,
      `- high priority: ${cluster.highCount}`,
      `- medium priority: ${cluster.mediumCount}`,
      `- maximum triage score: ${cluster.maxScore}`,
      `- root cause: \`${scaffold.rootCause}\``,
      `- ${regressionLine}`,
      `- ${baselineLine}`,
      "",
      "Affected interaction IDs:",
      ...cluster.interactionIds.map((id) => `- \`${id}\``),
      "",
      "Implementation guardrails:",
      "- preserve or add deterministic regression coverage before changing behavior",
      "- fix the systemic root cause rather than special-casing one live question",
      "- do not promote a live answer into rules authority",
      "- keep paid/model-backed smoke QA manual-only",
      "- run the listed deterministic checks before marking the PR ready",
      "",
      `Triage recommendation: ${scaffold.recommendedAction}`
    ].join("\n");
  }

  function buildRefinementScaffold(report, rootCause, options = {}) {
    validateReport(report);
    const key = text(rootCause);
    const cluster = report.clusters.find((item) => text(item?.rootCause) === key);
    if (!cluster) throw new Error(`Triage cluster not found: ${key || "(blank)"}.`);
    const ids = new Set((cluster.interactionIds || []).map(text).filter(Boolean));
    const interactions = report.interactions
      .filter((item) => ids.has(text(item?.interactionId)) && text(item?.rootCause) === key)
      .map((item) => ({
        interactionId: text(item.interactionId),
        createdAt: text(item.createdAt),
        question: text(item.question),
        score: Number(item.score || 0),
        priority: text(item.priority),
        reasons: Array.isArray(item.reasons) ? item.reasons.map(text).filter(Boolean) : [],
        signalCodes: Array.isArray(item.signalCodes) ? item.signalCodes.map(text).filter(Boolean) : []
      }));
    const target = TARGETS[key] || TARGETS.other_attention;
    const stamp = dateStamp(options.generatedAt || report.generatedAt);
    const branchName = `fix/rules-arbiter-${slug(key)}-${stamp}`;
    const scaffold = {
      schema: "gauntlet.rules-refinement-scaffold.v1",
      generatedAt: text(options.generatedAt || new Date().toISOString()),
      sourceTriageGeneratedAt: text(report.generatedAt),
      rootCause: key,
      label: text(cluster.label || key),
      recommendedAction: text(cluster.recommendedAction),
      cluster: {
        count: Number(cluster.count || ids.size),
        highCount: Number(cluster.highCount || 0),
        mediumCount: Number(cluster.mediumCount || 0),
        maxScore: Number(cluster.maxScore || 0),
        averageScore: Number(cluster.averageScore || 0),
        interactionIds: [...ids]
      },
      affectedInteractions: interactions,
      regressionRequest: {
        interactionIds: [...ids],
        rule: "Use only reviewed regression candidates for these interactions; never synthesize authority from triage alone."
      },
      implementationHints: {
        likelyFiles: [...target.likelyFiles],
        deterministicChecks: [...target.deterministicChecks]
      },
      branch: {
        base: text(options.baseBranch || "main"),
        suggestedName: branchName,
        commitMessage: `Scaffold Rules Arbiter ${slug(key)} refinement`
      },
      pullRequest: {
        title: `Refine Rules Arbiter: ${text(cluster.label || key)}`,
        draft: true,
        body: ""
      },
      privacy: {
        localOnlyFields: ["affectedInteractions.question"],
        publicManifestOmits: ["player question text", "answers", "session identifiers", "raw diagnostics"],
        note: "The scaffold may contain player-submitted question text for local review. The generated public manifest and PR body omit that text."
      }
    };
    scaffold.pullRequest.body = publicPrBody(scaffold);
    return scaffold;
  }

  function attachRegressionCandidates(scaffold, bundle) {
    if (!scaffold || scaffold.schema !== "gauntlet.rules-refinement-scaffold.v1") {
      throw new Error("Scaffold must use gauntlet.rules-refinement-scaffold.v1.");
    }
    if (!bundle || bundle.schema !== "gauntlet.rules-regression-candidates.v1" || !Array.isArray(bundle.candidates)) {
      throw new Error("Regression bundle must use gauntlet.rules-regression-candidates.v1.");
    }
    const wanted = new Set(scaffold.cluster.interactionIds.map(text));
    const candidates = bundle.candidates.filter((item) => wanted.has(text(item?.interactionId)));
    const found = new Set(candidates.map((item) => text(item?.interactionId)).filter(Boolean));
    const ready = candidates.filter((item) => item?.fixtureReadiness?.ready === true && item?.suggestedFixture);
    const manual = candidates.filter((item) => !item?.fixtureReadiness?.ready || !item?.suggestedFixture);
    const missing = [...wanted].filter((id) => !found.has(id));
    const regression = {
      sourceSchema: bundle.schema,
      candidateCount: candidates.length,
      readyCount: ready.length,
      alreadyCoveredCount: 0,
      manualCount: manual.length,
      missingInteractionIds: missing,
      candidates
    };
    const attached = { ...scaffold, regression };
    attached.pullRequest = { ...scaffold.pullRequest, body: publicPrBody(attached, regression) };
    return attached;
  }

  function withMaterializationResult(scaffold, result = {}) {
    const regression = scaffold.regression
      ? {
          ...scaffold.regression,
          readyCount: Number(result.addedCount ?? scaffold.regression.readyCount ?? 0),
          alreadyCoveredCount: Number(result.skippedCount ?? scaffold.regression.alreadyCoveredCount ?? 0),
          manualCount: Number(result.manualCount ?? scaffold.regression.manualCount ?? 0)
        }
      : null;
    const baseline = result.baseline || null;
    return {
      ...scaffold,
      regression,
      baseline,
      pullRequest: {
        ...scaffold.pullRequest,
        body: publicPrBody(scaffold, regression, baseline)
      }
    };
  }

  function toPublicManifest(scaffold) {
    if (!scaffold || scaffold.schema !== "gauntlet.rules-refinement-scaffold.v1") {
      throw new Error("Scaffold must use gauntlet.rules-refinement-scaffold.v1.");
    }
    return {
      schema: "gauntlet.rules-refinement-manifest.v1",
      generatedAt: scaffold.generatedAt,
      rootCause: scaffold.rootCause,
      label: scaffold.label,
      recommendedAction: scaffold.recommendedAction,
      cluster: { ...scaffold.cluster },
      regression: scaffold.regression ? {
        candidateCount: Number(scaffold.regression.candidateCount || 0),
        readyCount: Number(scaffold.regression.readyCount || 0),
        alreadyCoveredCount: Number(scaffold.regression.alreadyCoveredCount || 0),
        manualCount: Number(scaffold.regression.manualCount || 0),
        missingInteractionIds: [...(scaffold.regression.missingInteractionIds || [])]
      } : null,
      baseline: scaffold.baseline || null,
      implementationHints: {
        likelyFiles: [...(scaffold.implementationHints?.likelyFiles || [])],
        deterministicChecks: [...(scaffold.implementationHints?.deterministicChecks || [])]
      },
      branch: { ...scaffold.branch },
      pullRequest: { ...scaffold.pullRequest },
      privacy: {
        containsPlayerQuestionText: false,
        containsSessionIdentifiers: false,
        note: "Public refinement manifest intentionally omits raw player questions, answers, session identifiers, and diagnostics."
      }
    };
  }

  return {
    TARGETS,
    buildRefinementScaffold,
    attachRegressionCandidates,
    withMaterializationResult,
    toPublicManifest,
    publicPrBody
  };
}

export const refinementScaffold = createRefinementScaffoldEngine();
