import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MEASUREMENT_ID = "G-8YYYZJGGPE";
const CHECK_ONLY = process.argv.includes("--check");
const ROOT = process.cwd();
const SKIP_DIRECTORIES = new Set([".git", "node_modules"]);
const ANALYTICS_EXCLUDED_FILES = new Set([
  "playtest/session/index.html",
  "playtest/batch/index.html",
  "playtest/player-mat/index.html",
  "images/tools/mystics_rite_completed_P22_compositor_v2.html",
  "artifacts/reconstruction/clean-v0.6.3/browser-rulebook/index.html",
  "artifacts/reconstruction/clean-v0.6.3/rules-arbiter/index.html",
  "artifacts/reconstruction/clean-v0.6.3/card-reference/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/military/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/diplomats/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/financiers/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/intelligence/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/mystics/index.html",
  "artifacts/reconstruction/clean-v0.6.3/faction-pages/inquisition/index.html",
  "artifacts/reconstruction/clean-v0.6.3/start/index.html",
  "artifacts/reconstruction/clean-v0.6.3/deckbuilder/index.html",
  // Render-only TTS capture surfaces; they are not public navigation pages.
  "tts/back-renderer/index.html",
  "tts/supplemental-renderer/index.html",
  "tts/finalized-supplemental-renderer/index.html",
  // Embedded/render-only card surfaces; parent pages own analytics.
  "card-design/card-showcase-embed.html",
  // Internal card-design review/study surfaces; they are not public navigation pages.
  "card-design/capital-ledger-preview.html",
  "card-design/deed-ornament-study.html",
  "card-design/deed-rule-font-study.html",
  // Canonical embedded card-face surfaces; parent pages own analytics.
  "card-design/card-review-render.html",
  "card-design/component-render.html",
  "card-design/territory-review-render.html",
  // Legacy aliases retained only for old bookmarks/callers.
  "card-design/card-print-render.html",
  "card-design/component-print-render.html",
  "card-design/territory-print-render.html",
  // Versioned development/review surfaces are not public analytics pages.
  "v0.6.3/changes/index.html",
  "v0.6.3/deckbuilder/index.html",
  "v0.6.3/quick-reference/index.html",
  "v0.6.3/reference/index.html",
  "v0.6.3/rulebook/index.html",
  "v0.6.3/rules-arbiter/index.html",
  "v0.6.3/start/index.html"
]);

function normalizePackageRoot(value) {
  return String(value || "").replace(/^\/+/, "").replace(/\/+$/, "");
}

// The current release package index is a redirect shim. Analytics belongs on
// the canonical public landing page (/v0.6.3/), not on the package directory.
try {
  const lifecycle = JSON.parse(await readFile(path.join(ROOT, "config/release-lifecycle.json"), "utf8"));
  const current = lifecycle.releases?.[lifecycle.current_release];
  if (current?.current_package_path) {
    ANALYTICS_EXCLUDED_FILES.add(`${normalizePackageRoot(current.current_package_path)}/index.html`);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const GOOGLE_TAG = `  <meta name="gauntlet-analytics-id" content="${MEASUREMENT_ID}" />
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });
  </script>
  <script src="/analytics-consent.js?v=20260902-1" defer></script>`;

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findHtmlFiles(entryPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) files.push(entryPath);
  }
  return files;
}
function normalizedRelativePath(filePath) { return path.relative(ROOT, filePath).split(path.sep).join("/"); }

const htmlFiles = await findHtmlFiles(ROOT);
const eligibleFiles = htmlFiles.filter((filePath) => !ANALYTICS_EXCLUDED_FILES.has(normalizedRelativePath(filePath)));
const missing = [];
let updated = 0;
for (const filePath of eligibleFiles) {
  const source = await readFile(filePath, "utf8");
  if (source.includes(MEASUREMENT_ID)) continue;
  if (source.includes("googletagmanager.com/gtag/js?id=")) throw new Error(`${normalizedRelativePath(filePath)} already contains a different Google tag.`);
  if (!/<head(?:\s[^>]*)?>/i.test(source)) continue;
  const relativePath = normalizedRelativePath(filePath);
  missing.push(relativePath);
  if (!CHECK_ONLY) {
    const next = source.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}\n${GOOGLE_TAG}`);
    await writeFile(filePath, next, "utf8");
    updated += 1;
  }
}
if (CHECK_ONLY && missing.length) {
  console.error(`Analytics configuration ${MEASUREMENT_ID} is missing from:`);
  for (const file of missing) console.error(`- ${file}`);
  process.exitCode = 1;
} else if (CHECK_ONLY) {
  console.log(`Analytics configuration ${MEASUREMENT_ID} is present in all ${eligibleFiles.length} eligible HTML files; ${ANALYTICS_EXCLUDED_FILES.size} private, redirect, development, or print-only pages are intentionally excluded.`);
} else {
  console.log(`Added opt-in analytics configuration ${MEASUREMENT_ID} to ${updated} HTML files.`);
}
