import { AUTHORITY_SET_ID, CLEAN, read, syncText, prune, copyText, currentize, finish } from './publication-utils.mjs';

prune('rules-arbiter', new Set(['index.html','app.js','styles.css']));
copyText(`${CLEAN}/rules-arbiter/styles.css`, 'rules-arbiter/styles.css');
copyText(`${CLEAN}/rules-arbiter/index.html`, 'rules-arbiter/index.html', (html) => currentize(html, 'Gauntlet v0.6.3 Rules Arbiter', 'Ask gameplay questions against the current canonical Gauntlet v0.6.3 authority.', 'https://gauntlet.run/rules-arbiter/')
  .replaceAll('../../../../', '../').replaceAll('../browser-rulebook/', '../rulebook/')
  .replace(/clean v0\.6\.3 reconstruction/gi, 'v0.6.3').replace(/reconstruction worker/gi, 'production worker')
  .replace(/reconstruction Arbiter/gi, 'Rules Arbiter').replace(/downstream review surface, not the current public release/gi, 'current canonical Rules Arbiter'));
copyText(`${CLEAN}/rules-arbiter/app.js`, 'rules-arbiter/app.js', (app) => app
  .replace("import { buildLocalFallbackAnswer, retrieveRules } from \"../../../../rules-assistant/local-search.js\";", "import { buildLocalFallbackAnswer, retrieveRules } from \"../rules-assistant/local-search.js\";")
  .replace(/import \{\n  CLEAN_V063_RULES_VERSION,\n  CLEAN_V063_VERSION_LABEL,\n  defaultCleanV063SourceUrls,\n  loadCleanV063RulesCorpus\n\} from \"\.\/corpus\.js\";/, `import {\n  V063_RULES_VERSION as CLEAN_V063_RULES_VERSION,\n  V063_VERSION_LABEL as CLEAN_V063_VERSION_LABEL,\n  defaultV063SourceUrls as defaultCleanV063SourceUrls,\n  loadV063RulesCorpus as loadCleanV063RulesCorpus\n} from \"../rules-assistant/v063-public-corpus.js\";`)
  .replace('const endpoint = String(window.GAUNTLET_CLEAN_V063_RULES_ARBITER_ENDPOINT || "").trim();', 'const endpoint = String(window.GAUNTLET_RULES_ASSISTANT_ENDPOINT || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules").trim();')
  .replace('reconstruction: true,\n    currentPublicRelease: "v0.6.1"', 'reconstruction: false,\n    published: true,\n    currentPublicRelease: "v0.6.3"')
  .replace('Reconstruction Arbiter unavailable.', 'Rules Arbiter unavailable.')
  .replace('Isolated reconstruction worker configured; clean local source lookup remains the fallback.', 'Production Rules Arbiter configured; canonical local source lookup remains the fallback.')
  .replace('Clean local source-lookup mode. No production Rules Arbiter endpoint is used.', 'Canonical local source-lookup fallback mode.')
  .replace('Configured endpoint did not identify itself as the clean v0.6.3 reconstruction Rules Arbiter.', 'Configured endpoint did not identify itself as the v0.6.3 Rules Arbiter.')
  .replace('Reconstruction worker unavailable; using clean local source lookup.', 'Production worker unavailable; using canonical local source lookup.')
  .replace('This answer uses the clean-v0.6.3 reconstruction authority. It is a downstream review surface, not the current public release.', 'This answer uses the certified v0.6.3 authority.')
  .replace('Ask the reconstruction Arbiter', 'Ask the Rules Arbiter'));

const cleanCorpus = read(`${CLEAN}/rules-arbiter/corpus.js`);
let publicCorpus = cleanCorpus
  .replace('import { buildRulesCorpus } from "../../../../rules-assistant/local-search.js";', 'import { buildRulesCorpus } from "./local-search.js";')
  .replace('export const CLEAN_V063_RULES_VERSION = "clean-v0.6.3-reconstruction";', 'export const V063_RULES_VERSION = "v0.6.3";')
  .replace('export const CLEAN_V063_VERSION_LABEL = "Gauntlet clean v0.6.3 reconstruction";', 'export const V063_VERSION_LABEL = "Gauntlet v0.6.3";')
  .replace('export const CLEAN_V063_BROWSER_RULEBOOK_PATH =\n  "artifacts/reconstruction/clean-v0.6.3/browser-rulebook/";', 'export const CLEAN_V063_BROWSER_RULEBOOK_PATH = "rulebook/";\nexport const V063_PUBLISHED_RULEBOOK_PATH = "releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md";')
  .replaceAll('CLEAN_V063_RULES_VERSION', 'V063_RULES_VERSION').replaceAll('CLEAN_V063_VERSION_LABEL', 'V063_VERSION_LABEL')
  .replaceAll('defaultCleanV063SourceUrls', 'defaultV063SourceUrls').replaceAll('loadCleanV063RulesCorpus', 'loadV063RulesCorpus').replaceAll('validateCleanV063Inputs', 'validateV063Inputs')
  .replace('  const rulebookMarkdown = await rulebookResponse.text();\n  const canonicalData = await canonicalResponse.json();\n  validateV063Inputs({ rulebookMarkdown, canonicalData });', `  const [rulebookBytes, canonicalBytes] = await Promise.all([rulebookResponse.arrayBuffer(), canonicalResponse.arrayBuffer()]);\n  const [rulebookHash, canonicalHash] = await Promise.all([sha256(rulebookBytes), sha256(canonicalBytes)]);\n  if (rulebookHash !== CLEAN_V063_RULEBOOK_SHA256) throw new Error(\`v0.6.3 Rulebook source hash mismatch: \${rulebookHash}\`);\n  if (canonicalHash !== CLEAN_V063_CANONICAL_DATA_SHA256) throw new Error(\`v0.6.3 canonical-data source hash mismatch: \${canonicalHash}\`);\n  const rulebookMarkdown = new TextDecoder().decode(rulebookBytes);\n  const canonicalData = JSON.parse(new TextDecoder().decode(canonicalBytes));\n  validateV063Inputs({ rulebookMarkdown, canonicalData });\n  const publishedRulebookMarkdown = publicRulebookSource(rulebookMarkdown);`)
  .replace('    rulebookMarkdown,\n    siteOrigin:', '    rulebookMarkdown: publishedRulebookMarkdown,\n    siteOrigin:')
  .replace('corpus.reconstruction = true;', 'corpus.reconstruction = false;').replace('corpus.published = false;', 'corpus.published = true;')
  .replace('corpus.currentPublicRelease = "v0.6.1";', 'corpus.currentPublicRelease = "v0.6.3";')
  .replace('        sourcePath: CLEAN_V063_RULEBOOK_SOURCE_PATH,', '        sourcePath: V063_PUBLISHED_RULEBOOK_PATH,')
  .replace('"Canonical clean v0.6.3 reconstruction summary"', '"Canonical v0.6.3 summary"').replaceAll('Clean v0.6.3', 'v0.6.3');
publicCorpus += `\nfunction publicRulebookSource(source) {\n  return String(source || '').replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**').replace(/^> \\*\\*Authority candidate, not current\\/public rules\\.\\*\\*[^\\n]*\\n\\n/m, '');\n}\nasync function sha256(bytes) {\n  const digest = await crypto.subtle.digest('SHA-256', bytes);\n  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');\n}\nexport const V063_AUTHORITY_SET_ID = CLEAN_V063_AUTHORITY_SET_ID;\n`;
if (!publicCorpus.includes(AUTHORITY_SET_ID)) throw new Error('Published Rules Arbiter corpus lost authority binding.');
syncText('rules-assistant/v063-public-corpus.js', publicCorpus);
finish('Clean v0.6.3 Rules Arbiter browser/corpus');
