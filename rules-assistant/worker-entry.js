import v061Worker from "./worker-v061.js";
import v063Worker from "./worker-v063.js";
import v070Worker from "./worker-v070.js";
import worker from "./worker-v071.js";
import candidateWorker from "./worker-v062-candidate.js";
import publishedWorker from "./worker-v062.js";
import smartWorker from "./smart-worker.js";
import reliableWorker from "./reliable-worker.js";
import { ADMIN_PAGE_WITH_INCREMENTAL_EXPORT } from "./admin-incremental-export-page.js";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { handleReviewExportCheckpoint } from "./review-export-checkpoint.js";
import { handleReviewIntelligence } from "./review-intelligence.js";

const ADMIN_PAGE = ADMIN_PAGE_WITH_RULES_INTELLIGENCE || ADMIN_PAGE_WITH_INCREMENTAL_EXPORT;
const DEFAULT_SITE_ORIGIN = "https://gauntlet.run";
const FAVICON_VERSION = "20260804-1";
const DEVELOPER_THEME_VERSION = "20260815-1";

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

export function addDeveloperToolChrome(html, origin = DEFAULT_SITE_ORIGIN) {
  if (html.includes("developer-site-header") || html.includes("developer-tools.css")) return html;

  const styles = [
    `  <link rel="preconnect" href="https://use.typekit.net">`,
    `  <link rel="preconnect" href="https://p.typekit.net" crossorigin>`,
    `  <link rel="stylesheet" href="${origin}/site.css">`,
    `  <link rel="stylesheet" href="${origin}/developer-tools.css?v=${DEVELOPER_THEME_VERSION}">`,
    `  <style id="rules-admin-layout-fix">
    .developer-rules-page #dashboard > header {
      grid-template-columns: minmax(360px, .8fr) minmax(0, 1.2fr);
    }
    .developer-rules-page #dashboard > header .actions {
      min-width: 0;
      justify-content: flex-end;
    }
    @media (max-width: 820px) {
      .developer-rules-page #dashboard > header {
        grid-template-columns: 1fr;
      }
      .developer-rules-page #dashboard > header .actions {
        justify-content: flex-start;
      }
    }
  </style>`
  ].join("\n");

  const header = `<header class="site-header developer-site-header">
    <a class="brand" href="${origin}/" aria-label="Gauntlet home">
      <span class="brand-mark" aria-hidden="true">G</span>
      <span>Gauntlet</span>
    </a>
    <nav aria-label="Developer navigation">
      <a href="${origin}/playtest/analysis/">Playtest Analysis</a>
      <a href="${origin}/playtest/host/">Host Home</a>
      <a href="${origin}/rulebook/">Rules</a>
      <a href="${origin}/">Main site</a>
    </nav>
  </header>`;

  const footer = `<footer class="developer-site-footer">
    <div>
      <a class="brand footer-brand" href="${origin}/" aria-label="Gauntlet home">
        <span class="brand-mark" aria-hidden="true">G</span>
        <span>Gauntlet</span>
      </a>
      <p><!-- PUBLISHING-FACT:publisher.line -->Published by TDS Games<!-- /PUBLISHING-FACT --> · <!-- PUBLISHING-FACT:publisher.parent_line -->An imprint of Misty Hollow Enterprises<!-- /PUBLISHING-FACT --></p>
    </div>
    <p class="copyright"><!-- PUBLISHING-FACT:copyright.notice -->Copyright © 2026 Tymon Scott. All rights reserved.<!-- /PUBLISHING-FACT --></p>
  </footer>`;

  return html
    .replace(/<\/head>/i, `${styles}\n</head>`)
    .replace(/<body([^>]*)>/i, (_match, attrs) => {
      const bodyAttrs = String(attrs || "");
      if (/\bclass\s*=/.test(bodyAttrs)) {
        return `<body${bodyAttrs.replace(/\bclass\s*=\s*(["'])(.*?)\1/i, (_classMatch, quote, classes) => `class=${quote}${classes} developer-page developer-rules-page${quote}`)}>`;
      }
      return `<body${bodyAttrs} class="developer-page developer-rules-page">`;
    })
    .replace(/<body([^>]*)>/i, `$&\n${header}`)
    .replace(/<\/body>/i, `${footer}\n</body>`);
}

function addCspSources(contentSecurityPolicy, directive, sources) {
  if (!contentSecurityPolicy) return contentSecurityPolicy;
  const pattern = new RegExp(`(\\b${directive}\\b[^;]*)`, "i");
  const currentMatch = contentSecurityPolicy.match(pattern);
  const currentDirective = currentMatch?.[1] || "";
  const missing = sources.filter((source) => !currentDirective.includes(source));
  if (!missing.length) return contentSecurityPolicy;

  if (currentMatch) {
    return contentSecurityPolicy.replace(pattern, `$1 ${missing.join(" ")}`);
  }
  return `${contentSecurityPolicy.trim().replace(/;?$/, ";")} ${directive} ${missing.join(" ")};`;
}

export function allowSiteImages(contentSecurityPolicy, origin = DEFAULT_SITE_ORIGIN) {
  return addCspSources(contentSecurityPolicy, "img-src", [origin]);
}

export function allowSiteAssets(contentSecurityPolicy, origin = DEFAULT_SITE_ORIGIN) {
  let policy = contentSecurityPolicy;
  policy = addCspSources(policy, "style-src", [origin, "https://use.typekit.net"]);
  policy = addCspSources(policy, "font-src", ["https://use.typekit.net", "https://p.typekit.net"]);
  policy = addCspSources(policy, "img-src", [origin, "https://p.typekit.net"]);
  return policy;
}

function withoutPaidModel(env) {
  return { ...env, OPENAI_API_KEY: undefined };
}

function rewriteVersionedPath(request) {
  const versionedUrl = new URL(request.url);
  versionedUrl.pathname = versionedUrl.pathname.includes("health") ? "/api/health" : "/api/rules";
  return new Request(versionedUrl, request);
}

async function requestedRulesVersion(request) {
  if (request.method !== "POST") return "";
  try {
    const payload = await request.clone().json();
    return String(payload?.rulesVersion || "").trim();
  } catch {
    return "";
  }
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

    if (
      url.pathname === "/api/v061/rules" || url.pathname === "/v061/rules" ||
      url.pathname === "/api/v061/health" || url.pathname === "/v061/health"
    ) {
      return v061Worker.fetch(rewriteVersionedPath(request), withoutPaidModel(env), context);
    }

    if (
      url.pathname === "/api/v063/rules" || url.pathname === "/v063/rules" ||
      url.pathname === "/api/v063/health" || url.pathname === "/v063/health"
    ) {
      return v063Worker.fetch(rewriteVersionedPath(request), withoutPaidModel(env), context);
    }

    if (
      url.pathname === "/api/v070/rules" || url.pathname === "/v070/rules" ||
      url.pathname === "/api/v070/health" || url.pathname === "/v070/health"
    ) {
      return v070Worker.fetch(rewriteVersionedPath(request), withoutPaidModel(env), context);
    }

    if (
      request.method === "GET" &&
      [
        "/corpus-health",
        "/api/corpus-health",
        "/v071/corpus-health",
        "/api/v071/corpus-health"
      ].includes(url.pathname)
    ) {
      return worker.fetch(request, env, context);
    }

    if (
      url.pathname === "/api/v071/rules" || url.pathname === "/v071/rules" ||
      url.pathname === "/api/v071/health" || url.pathname === "/v071/health"
    ) {
      return worker.fetch(rewriteVersionedPath(request), env, context);
    }

    // The unversioned public Rules Arbiter follows the current canonical release.
    if (url.pathname === "/api/health" || url.pathname === "/health") return worker.fetch(request, env, context);

    // Preserve historical clients while the unversioned route advances to v0.7.1.
    if (url.pathname === "/api/rules" || url.pathname === "/rules") {
      const requestedVersion = await requestedRulesVersion(request);
      if (requestedVersion === "v0.6.1") return v061Worker.fetch(request, withoutPaidModel(env), context);
      if (requestedVersion === "v0.6.3") return v063Worker.fetch(request, withoutPaidModel(env), context);
      if (requestedVersion === "v0.7.0") return v070Worker.fetch(request, withoutPaidModel(env), context);
      return worker.fetch(request, env, context);
    }

    // Withdrawn v0.6.2 remains explicitly addressable as historical evidence, never as the default.
    if (
      url.pathname === "/api/v062/rules" || url.pathname === "/v062/rules" ||
      url.pathname === "/api/v062/health" || url.pathname === "/v062/health"
    ) {
      return publishedWorker.fetch(request, withoutPaidModel(env), context);
    }

    if (url.pathname.startsWith("/api/v062-candidate/") || url.pathname.startsWith("/v062-candidate/")) {
      return candidateWorker.fetch(rewriteCandidatePath(request), withoutPaidModel(env), context);
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
      const response = await v061Worker.fetch(request, env, context);
      const origin = siteOrigin(env);
      const headers = new Headers(response.headers);
      const contentSecurityPolicy = allowSiteAssets(headers.get("Content-Security-Policy"), origin);
      if (contentSecurityPolicy) headers.set("Content-Security-Policy", contentSecurityPolicy);
      return new Response(addDeveloperToolChrome(addSiteFaviconLinks(ADMIN_PAGE, origin), origin), {
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