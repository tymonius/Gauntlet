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
  test("pins authorization to the official manual main-branch workflow", () => {
    expect(githubActionsQaAuthContract).toEqual({
      audience: "gauntlet-rules-assistant-live-qa",
      repository: "tymonius/Gauntlet",
      repositoryId: "375950579",
      workflowRef: "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-live-qa.yml@refs/heads/main",
      eventName: "workflow_dispatch",
      ref: "refs/heads/main",
      runnerEnvironment: "github-hosted",
      header: "X-Gauntlet-QA-OIDC"
    });
    expect(claimsAreAuthorized(validClaims(), now)).toBe(true);
  });

  test.each([
    ["wrong audience", { aud: "not-gauntlet" }],
    ["wrong repository", { repository: "tymonius/Other" }],
    ["wrong repository id", { repository_id: "1" }],
    ["wrong workflow", { workflow_ref: "tymonius/Gauntlet/.github/workflows/other.yml@refs/heads/main" }],
    ["wrong event", { event_name: "push" }],
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
