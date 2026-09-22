import { describe, expect, test } from "vitest";
import {
  claimsAreAuthorized,
  githubActionsQaAuthContract
} from "./github-actions-qa-auth.js";

const now = 1_789_124_400;

function validClaims(overrides = {}) {
  return {
    iss: "https://token.actions.githubusercontent.com",
    aud: githubActionsQaAuthContract.audience,
    repository: githubActionsQaAuthContract.repository,
    repository_id: githubActionsQaAuthContract.repositoryId,
    workflow_ref: githubActionsQaAuthContract.workflowRef,
    event_name: githubActionsQaAuthContract.eventName,
    ref: githubActionsQaAuthContract.ref,
    runner_environment: githubActionsQaAuthContract.runnerEnvironment,
    run_id: "34500000000",
    run_attempt: "1",
    iat: now - 60,
    nbf: now - 60,
    exp: now + 240,
    ...overrides
  };
}

describe("GitHub Actions live-QA OIDC authorization", () => {
  test("pins authorization to the official manual main-branch QA workflows", () => {
    expect(githubActionsQaAuthContract).toEqual({
      audience: "gauntlet-rules-assistant-live-qa",
      repository: "tymonius/Gauntlet",
      repositoryId: "375950579",
      workflowRef: "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-live-qa.yml@refs/heads/main",
      workflowRefs: [
        "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-live-qa.yml@refs/heads/main",
        "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main",
        "tymonius/Gauntlet/.github/workflows/rules-arbiter-gate3-blind-d.yml@refs/heads/main",
        "tymonius/Gauntlet/.github/workflows/rules-arbiter-gate3-blind-e.yml@refs/heads/main",
        "tymonius/Gauntlet/.github/workflows/v072-candidate-rules-arbiter-regression-replay.yml@refs/heads/main"
      ],
      workflowEventNames: {
        "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-live-qa.yml@refs/heads/main": ["workflow_dispatch"],
        "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-gate3-blind.yml@refs/heads/main": ["workflow_dispatch"],
        "tymonius/Gauntlet/.github/workflows/rules-arbiter-gate3-blind-d.yml@refs/heads/main": ["workflow_dispatch"],
        "tymonius/Gauntlet/.github/workflows/rules-arbiter-gate3-blind-e.yml@refs/heads/main": ["workflow_dispatch"],
        "tymonius/Gauntlet/.github/workflows/v072-candidate-rules-arbiter-regression-replay.yml@refs/heads/main": ["workflow_dispatch"]
      },
      eventName: "workflow_dispatch",
      ref: "refs/heads/main",
      runnerEnvironment: "github-hosted",
      header: "X-Gauntlet-QA-OIDC"
    });
    expect(claimsAreAuthorized(validClaims(), now)).toBe(true);
  });

  test("authorizes the dedicated manual QA workflows on main", () => {
    for (const workflow_ref of githubActionsQaAuthContract.workflowRefs.slice(1, 4)) {
      expect(claimsAreAuthorized(validClaims({ workflow_ref }), now)).toBe(true);
    }
  });

  test("rejects push-triggered QA for every paid workflow", () => {
    for (const workflow_ref of githubActionsQaAuthContract.workflowRefs) {
      expect(claimsAreAuthorized(validClaims({ workflow_ref, event_name: "push" }), now)).toBe(false);
    }
  });

  test.each([
    ["wrong audience", { aud: "not-gauntlet" }],
    ["wrong repository", { repository: "tymonius/Other" }],
    ["wrong repository id", { repository_id: "1" }],
    ["wrong workflow", { workflow_ref: "tymonius/Gauntlet/.github/workflows/other.yml@refs/heads/main" }],
    ["wrong event", { event_name: "pull_request" }],
    ["wrong ref", { ref: "refs/heads/feature" }],
    ["self-hosted runner", { runner_environment: "self-hosted" }],
    ["expired token", { exp: now }],
    ["future token", { nbf: now + 60 }],
    ["stale token", { iat: now - 601 }],
    ["missing run id", { run_id: "" }]
  ])("rejects %s", (_label, override) => {
    expect(claimsAreAuthorized(validClaims(override), now)).toBe(false);
  });

  test("accepts an audience array only when the QA audience is present", () => {
    expect(claimsAreAuthorized(validClaims({ aud: ["other", githubActionsQaAuthContract.audience] }), now)).toBe(true);
    expect(claimsAreAuthorized(validClaims({ aud: ["other"] }), now)).toBe(false);
  });
});
