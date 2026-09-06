const SOURCE_AUTHORITY_SIGNAL_CODES = new Set([
  "review_missing_rule",
  "review_ambiguous_rule",
  "audit_source_data",
  "audit_rule_clarification",
  "audit_rule_change"
]);
const RESOLUTION_LEDGER_PATH = "artifacts/rules-refinement/resolution-ledger.json";

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
      likelyFiles: [
        "rulebook/player-facing/current-rulebook.md",
        "game-data/current-game.json",
        "rules-assistant/v071-public-corpus.js"
      ],
      deterministicChecks: [
        "npm run rules:authority:check",
        "npm run test:current-contract",
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

  function sourceAuthorityRemediation(interactions) {
    const reasonSignalCodes = [...new Set(
      interactions.flatMap((item) => item.signalCodes || []).filter((code) => SOURCE_AUTHORITY_SIGNAL_CODES.has(code))
    )];
    const required = reasonSignalCodes.length > 0;
    return {
      sourceAuthorityRequired: required,
      reasonSignalCodes,
      authorityFileCandidates: [
        "rulebook/player-facing/current-rulebook.md",
        "game-data/current-game.json"
      ],
      rule: required
        ? "Resolve missing or ambiguous game semantics in current game authority before changing Rules Arbiter behavior."
        : "Confirm that current authority already settles the issue before changing Rules Arbiter behavior."
    };
  }

  function resolutionRequest(rootCause, interactionIds) {
    return {
      ledgerPath: RESOLUTION_LEDGER_PATH,
      rootCause,
      interactionIds: [...interactionIds],
      requiredStatus: "resolved",
      requiredFields: [
        "id",
        "status",
        "rootCause",
        "interactionIds",
        "resolutionSurface",
        "summary",
        "resolvedAt",
        "binding"
      ],
      bindingRule: "Bind the merged refinement to at least one authoritySetId, behaviorRevision, or fix commit before merge.",
      retirementRule: "Only status=resolved entries retire reviewed interactions from the active backlog."
    };
  }

  function publicPrBody(scaffold, regression = null, baseline = null) {
    const cluster = scaffold.cluster;
    const regressionLine = regression
      ? `Regression fixtures: ${regression.readyCount} ready, ${regression.alreadyCoveredCount} already covered, ${regression.manualCount} needing manual fixture work.`
      : "Regression fixtures: attach the reviewed regression-candidate bundle before implementation.";
    const baselineLine = baseline
      ? `Deterministic baseline: ${baseline.result.toUpperCase()} (${baseline.command}).`
      : "Deterministic baseline: run by the materialization script after regression fixtures are applied.";
    const sourceLine = scaffold.remediation?.sourceAuthorityRequired
      ? "Source authority remediation: REQUIRED — accepted game-rule semantics must be added to current authority before any Arbiter behavior change."
      : "Source authority remediation: not automatically required — confirm current authority is already explicit before changing Arbiter behavior.";
    const resolutionLine = `Resolution ledger: REQUIRED — record every affected interaction in ${scaffold.resolutionRequest?.ledgerPath || RESOLUTION_LEDGER_PATH} as resolved and bind the fix to its resulting authority set, behavior revision, or commit before merge.`;
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
      `- ${sourceLine}`,
      `- ${resolutionLine}`,
      "",
      "Affected interaction IDs:",
      ...cluster.interactionIds.map((id) => `- \`${id}\``),
      "",
      "Implementation guardrails:",
      "- preserve or add deterministic regression coverage before changing behavior",
      "- fix the systemic root cause rather than special-casing one live question",
      "- a reviewed live answer is evidence, not rules authority; only an accepted game-rule decision may amend current authority",
      "- when current authority is missing or ambiguous, correct the game rules at the source before changing Rules Arbiter behavior",
      "- Rules Arbiter behavior must consume the corrected authority rather than duplicate hidden game semantics in prompts or retrieval logic",
      "- record the resolved interaction IDs and durable fix binding in the refinement resolution ledger before merge",
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
    const remediation = sourceAuthorityRemediation(interactions);
    const clusterIds = [...ids];
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
        interactionIds: clusterIds
      },
      affectedInteractions: interactions,
      remediation,
      regressionRequest: {
        interactionIds: clusterIds,
        rule: "Use only reviewed regression candidates for these interactions; never synthesize authority from triage alone."
      },
      resolutionRequest: resolutionRequest(key, clusterIds),
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
      remediation: scaffold.remediation ? {
        sourceAuthorityRequired: scaffold.remediation.sourceAuthorityRequired === true,
        reasonSignalCodes: [...(scaffold.remediation.reasonSignalCodes || [])],
        authorityFileCandidates: [...(scaffold.remediation.authorityFileCandidates || [])],
        rule: scaffold.remediation.rule
      } : null,
      regression: scaffold.regression ? {
        candidateCount: Number(scaffold.regression.candidateCount || 0),
        readyCount: Number(scaffold.regression.readyCount || 0),
        alreadyCoveredCount: Number(scaffold.regression.alreadyCoveredCount || 0),
        manualCount: Number(scaffold.regression.manualCount || 0),
        missingInteractionIds: [...(scaffold.regression.missingInteractionIds || [])]
      } : null,
      resolutionRequest: scaffold.resolutionRequest ? {
        ledgerPath: scaffold.resolutionRequest.ledgerPath,
        rootCause: scaffold.resolutionRequest.rootCause,
        interactionIds: [...(scaffold.resolutionRequest.interactionIds || [])],
        requiredStatus: scaffold.resolutionRequest.requiredStatus,
        requiredFields: [...(scaffold.resolutionRequest.requiredFields || [])],
        bindingRule: scaffold.resolutionRequest.bindingRule,
        retirementRule: scaffold.resolutionRequest.retirementRule
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
    SOURCE_AUTHORITY_SIGNAL_CODES,
    RESOLUTION_LEDGER_PATH,
    buildRefinementScaffold,
    attachRegressionCandidates,
    withMaterializationResult,
    toPublicManifest,
    publicPrBody
  };
}

export const refinementScaffold = createRefinementScaffoldEngine();
