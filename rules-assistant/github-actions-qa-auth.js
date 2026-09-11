const GITHUB_ACTIONS_OIDC_ISSUER = "https://token.actions.githubusercontent.com";
const GITHUB_ACTIONS_OIDC_JWKS = "https://token.actions.githubusercontent.com/.well-known/jwks";
const QA_OIDC_AUDIENCE = "gauntlet-rules-assistant-live-qa";
const QA_REPOSITORY = "tymonius/Gauntlet";
const QA_REPOSITORY_ID = "375950579";
const QA_WORKFLOW_REF = "tymonius/Gauntlet/.github/workflows/current-rules-arbiter-live-qa.yml@refs/heads/main";
const QA_EVENT_NAME = "workflow_dispatch";
const QA_REF = "refs/heads/main";
const QA_RUNNER_ENVIRONMENT = "github-hosted";
const QA_TOKEN_HEADER = "X-Gauntlet-QA-OIDC";
const JWKS_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedJwks = null;
let cachedJwksAt = 0;

function decodeBase64Url(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(normalized + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJsonPart(value) {
  const bytes = decodeBase64Url(value);
  return JSON.parse(new TextDecoder().decode(bytes));
}

function audienceMatches(audience) {
  if (Array.isArray(audience)) return audience.includes(QA_OIDC_AUDIENCE);
  return audience === QA_OIDC_AUDIENCE;
}

export function claimsAreAuthorized(claims, nowSeconds) {
  if (claims?.iss !== GITHUB_ACTIONS_OIDC_ISSUER) return false;
  if (!audienceMatches(claims?.aud)) return false;
  if (claims?.repository !== QA_REPOSITORY) return false;
  if (String(claims?.repository_id || "") !== QA_REPOSITORY_ID) return false;
  if (claims?.workflow_ref !== QA_WORKFLOW_REF) return false;
  if (claims?.event_name !== QA_EVENT_NAME) return false;
  if (claims?.ref !== QA_REF) return false;
  if (claims?.runner_environment !== QA_RUNNER_ENVIRONMENT) return false;

  const exp = Number(claims?.exp);
  const nbf = Number(claims?.nbf);
  const iat = Number(claims?.iat);
  if (!Number.isFinite(exp) || exp <= nowSeconds) return false;
  if (Number.isFinite(nbf) && nbf > nowSeconds + 30) return false;
  if (!Number.isFinite(iat) || iat > nowSeconds + 30 || iat < nowSeconds - 10 * 60) return false;
  if (!String(claims?.run_id || "").match(/^\d+$/)) return false;
  return true;
}

async function loadJwks({ force = false } = {}) {
  if (!force && cachedJwks && Date.now() - cachedJwksAt < JWKS_CACHE_TTL_MS) {
    return cachedJwks;
  }

  const response = await fetch(GITHUB_ACTIONS_OIDC_JWKS, { cache: "no-store" });
  if (!response.ok) throw new Error(`GitHub Actions OIDC JWKS returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!Array.isArray(payload?.keys)) throw new Error("GitHub Actions OIDC JWKS response is invalid.");
  cachedJwks = payload.keys;
  cachedJwksAt = Date.now();
  return cachedJwks;
}

async function findSigningKey(kid) {
  let keys = await loadJwks();
  let jwk = keys.find((candidate) => candidate?.kid === kid && candidate?.kty === "RSA");
  if (!jwk) {
    keys = await loadJwks({ force: true });
    jwk = keys.find((candidate) => candidate?.kid === kid && candidate?.kty === "RSA");
  }
  return jwk || null;
}

async function verifyJwt(token) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) return null;

  let header;
  let claims;
  try {
    header = decodeJsonPart(parts[0]);
    claims = decodeJsonPart(parts[1]);
  } catch {
    return null;
  }

  if (header?.alg !== "RS256" || header?.typ !== "JWT" || !header?.kid) return null;
  const jwk = await findSigningKey(header.kid);
  if (!jwk || (jwk.use && jwk.use !== "sig") || (jwk.alg && jwk.alg !== "RS256")) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const verified = await crypto.subtle.verify(
    { name: "RSASSA-PKCS1-v1_5" },
    key,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  return verified ? claims : null;
}

export async function authorizeGitHubActionsQa(request) {
  const token = String(request?.headers?.get(QA_TOKEN_HEADER) || "").trim();
  if (!token) return { authorized: false, reason: "qa_oidc_not_present" };

  try {
    const claims = await verifyJwt(token);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (!claims || !claimsAreAuthorized(claims, nowSeconds)) {
      return { authorized: false, reason: "qa_oidc_invalid" };
    }
    return {
      authorized: true,
      reason: "qa_oidc_authorized",
      runId: String(claims.run_id),
      runAttempt: String(claims.run_attempt || "1"),
      workflowSha: String(claims.workflow_sha || "")
    };
  } catch (error) {
    console.error("Rules Arbiter QA OIDC verification failed closed", error);
    return { authorized: false, reason: "qa_oidc_verification_error" };
  }
}

export const githubActionsQaAuthContract = Object.freeze({
  audience: QA_OIDC_AUDIENCE,
  repository: QA_REPOSITORY,
  repositoryId: QA_REPOSITORY_ID,
  workflowRef: QA_WORKFLOW_REF,
  eventName: QA_EVENT_NAME,
  ref: QA_REF,
  runnerEnvironment: QA_RUNNER_ENVIRONMENT,
  header: QA_TOKEN_HEADER
});
