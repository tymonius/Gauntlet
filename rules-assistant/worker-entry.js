import worker from "./worker-v061.js";
import candidateWorker from "./worker-v062-candidate.js";
import publishedWorker from "./worker-v062.js";
import currentPublishedWorker from "./worker-v063.js";
import v063CandidateWorker from "./worker-v063-candidate.js";
import smartWorker from "./smart-worker.js";
import reliableWorker from "./reliable-worker.js";
import { ADMIN_PAGE_WITH_INCREMENTAL_EXPORT } from "./admin-incremental-export-page.js";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js";
import { handleReviewIntelligence } from "./review-intelligence.js";

const ADMIN_PAGE = ADMIN_PAGE_WITH_RULES_INTELLIGENCE || ADMIN_PAGE_WITH_INCREMENTAL_EXPORT;
const DEFAULT_SITE_ORIGIN = "https://gauntlet.run";
const FAVICON_VERSION = "20260804-1";

function siteOrigin(env) {
  try {
    return new URL(String(env?.SITE_ORIGIN || DEFAULT_SITE_ORIGIN)).origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function addSiteFaviconLinks(html, origin = DEFAULT_SITE_ORIGIN) {
  if (/\brel=["'](?:icon|apple-touch-icon)["']/i.test(html)) return html;

  const links = [
    `  <link rel="icon" type="image/png" href="${origin}/favicon-32.png?v=${FAVICON_VERSION}" sizes="32x32">`,
    `  <link rel="icon" type="image/x-icon" href="${origin}/favicon.ico?v=${FAVICON_VERSION}" sizes="any">`,
    `  <link rel="apple-touch-icon" href="${origin}/apple-touch-icon.png?v=${FAVICON_VERSION}">`
  ].join("\n");

  const viewportPattern = /(<meta\b[^>]*\bname=["']viewport["'][^>]*>)/i;
  if (viewportPattern.test(html)) return html.replace(viewportPattern, `$1\n${links}`);
  return html.replace(/<head\b[^>]*>/i, `$&\n${links}`);
}

export function allowSiteImages(contentSecurityPolicy, origin = DEFAULT_SITE_ORIGIN) {
  if (!contentSecurityPolicy || contentSecurityPolicy.includes(origin)) {
    return contentSecurityPolicy;
  }

  if (/\bimg-src\b/i.test(contentSecurityPolicy)) {
    return contentSecurityPolicy.replace(
      /(\bimg-src\b[^;]*)/i,
      `$1 ${origin}`
    );
  }

  return `${contentSecurityPolicy.trim().replace(/;?$/, ";")} img-src 'self' data: ${origin};`;
}

function rewriteCandidatePath(request) {
  const candidateUrl = new URL(request.url);
  candidateUrl.pathname = candidateUrl.pathname
    .replace(/^\/api\/v062-candidate\//, "/api/v062/")
    .replace(/^\/v062-candidate\//, "/v062/");
  return new Request(candidateUrl, request);
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);

    if (url.pathname === "/api/v061/rules" || url.pathname === "/v061/rules" || url.pathname === "/api/v061/health" || url.pathname === "/v061/health") {
      const legacyUrl = new URL(request.url);
      legacyUrl.pathname = legacyUrl.pathname.includes("health") ? "/api/health" : "/api/rules";
      return worker.fetch(new Request(legacyUrl, request), env, context);
    }

    if (
      url.pathname === "/api/v062/rules" ||
      url.pathname === "/v062/rules" ||
      url.pathname === "/api/v062/health" ||
      url.pathname === "/v062/health"
    ) {
      return publishedWorker.fetch(request, env, context);
    }

    if (["/api/rules","/rules","/api/health","/health","/api/v063/rules","/v063/rules","/api/v063/health","/v063/health"].includes(url.pathname)) return currentPublishedWorker.fetch(request, env, context);

    if (url.pathname.startsWith("/api/v063-candidate/") || url.pathname.startsWith("/v063-candidate/")) {
      const candidateUrl = new URL(request.url);
      candidateUrl.pathname = candidateUrl.pathname.replace(/^\/api\/v063-candidate\//,"/api/v063/").replace(/^\/v063-candidate\//,"/v063/");
      return v063CandidateWorker.fetch(new Request(candidateUrl, request), env, context);
    }

    if (url.pathname.startsWith("/api/v062-candidate/") || url.pathname.startsWith("/v062-candidate/")) {
      return candidateWorker.fetch(rewriteCandidatePath(request), env, context);
    }

    if (url.pathname === "/api/admin/review-export-checkpoint") {
      return handleReviewExportCheckpoint(request, env);
    }

    if (
      url.pathname === "/api/admin/review-intelligence" ||
      url.pathname === "/api/admin/review-corpus" ||
      url.pathname === "/api/admin/review-audits" ||
      url.pathname === "/api/admin/summary" ||
      (request.method === "GET" && url.pathname === "/api/admin/interactions")
    ) {
      return handleReviewIntelligence(request, env);
    }

    if (request.method === "GET" && ["/admin", "/admin/"].includes(url.pathname)) {
      const response = await worker.fetch(request, env, context);
      const origin = siteOrigin(env);
      const headers = new Headers(response.headers);
      headers.set(
        "Content-Security-Policy",
        allowSiteImages(headers.get("Content-Security-Policy"), origin)
      );

      return new Response(addSiteFaviconLinks(ADMIN_PAGE, origin), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    }

    if (String(env.RULES_RELIABLE_FALLBACK || "on").toLowerCase() === "off") {
      return smartWorker.fetch(request, env, context);
    }
    return reliableWorker.fetch(request, env, context);
  }
};
