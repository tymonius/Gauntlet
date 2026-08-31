import { CLEAN, read, syncText, finish } from './publication-utils.mjs';

const cleanWorker = read(`${CLEAN}/rules-arbiter/worker.js`);
let publicWorker = cleanWorker
  .replace('import { buildLocalFallbackAnswer, retrieveRules } from "../../../../rules-assistant/local-search.js";', 'import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";')
  .replace(/import \{\n  CLEAN_V063_RULES_VERSION,\n  CLEAN_V063_VERSION_LABEL,\n  defaultCleanV063SourceUrls,\n  loadCleanV063RulesCorpus\n\} from \"\.\/corpus\.js\";/, `import {\n  V063_RULES_VERSION as CLEAN_V063_RULES_VERSION,\n  V063_VERSION_LABEL as CLEAN_V063_VERSION_LABEL,\n  defaultV063SourceUrls as defaultCleanV063SourceUrls,\n  loadV063RulesCorpus as loadCleanV063RulesCorpus\n} from \"./v063-public-corpus.js\";`)
  .replace('You are the Gauntlet Rules Arbiter operating on the clean v0.6.3 reconstruction authority for downstream review.', 'You are the Gauntlet Rules Arbiter for the current canonical v0.6.3 playtest edition.')
  .replace('Use only the supplied clean source passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, withdrawn Gauntlet releases, historical candidate text, or unstated design facts.', 'Use only the supplied certified v0.6.3 source passages, recent conversation, prior session rulings, and adjudication principles supplied with the question. Do not use outside knowledge, withdrawn Gauntlet releases, historical candidate text, or unstated design facts.')
  .replace('7. Never describe this reconstruction surface as published or current public rules.\n\n', '')
  .replace('service: "gauntlet-rules-arbiter-clean-v063-reconstruction"', 'service: "gauntlet-rules-assistant"')
  .replace('reconstruction: true,\n        published: false,\n        currentPublicRelease: "v0.6.1"', 'reconstruction: false,\n        published: true,\n        currentPublicRelease: "v0.6.3"')
  .replaceAll('"/clean-v063/health", "/api/clean-v063/health"', '"/v063/health", "/api/v063/health"')
  .replaceAll('"/clean-v063/rules", "/api/clean-v063/rules"', '"/v063/rules", "/api/v063/rules"')
  .replace('This isolated Rules Arbiter answers ${CLEAN_V063_VERSION_LABEL} questions only.', 'This Rules Arbiter answers ${CLEAN_V063_VERSION_LABEL} questions only.')
  .replaceAll('Clean v0.6.3 reconstruction Rules Arbiter failure', 'v0.6.3 Rules Arbiter failure').replaceAll('reconstruction Rules Arbiter', 'Rules Arbiter')
  .replace('mode: "ai-reconstruction"', 'mode: "ai"').replace('`CLEAN AUTHORITY SOURCES\\n${sourceText}`', '`CANONICAL SOURCES\\n${sourceText}`')
  .replace('name: "gauntlet_clean_v063_rules_answer"', 'name: "gauntlet_v063_rules_answer"').replaceAll('"Clean source"', '"Canonical source"')
  .replace('console.error("Could not load reconstruction Rules Arbiter session history", error);', 'console.error("Could not load Rules Arbiter session history", error);')
  .replace('console.error("Could not persist reconstruction Rules Arbiter interaction", error);', 'console.error("Could not persist Rules Arbiter interaction", error);')
  .replace('executionPath: result.executionPath || "reconstruction"', 'executionPath: result.executionPath || "canonical"')
  .replace('reconstruction: true,\n    published: false,\n    currentPublicRelease: "v0.6.1"', 'reconstruction: false,\n    published: true,\n    currentPublicRelease: "v0.6.3"')
  .replace('const salt = env.SAFETY_ID_SALT || "gauntlet-clean-v063-rules-arbiter";', 'const salt = env.SAFETY_ID_SALT || "gauntlet-v063-rules-arbiter";');
syncText('rules-assistant/worker-v063.js', publicWorker);

let entry = read('rules-assistant/worker-entry.js');
entry = entry
  .replace('import worker from "./worker-v061.js";', 'import v061Worker from "./worker-v061.js";\nimport worker from "./worker-v063.js";')
  .replace('return worker.fetch(rewriteVersionedPath(request), env, context);', 'return v061Worker.fetch(rewriteVersionedPath(request), env, context);')
  .replace('function rewriteCandidatePath(request) {', `async function requestedRulesVersion(request) {\n  if (request.method !== "POST") return "";\n  try {\n    const payload = await request.clone().json();\n    return String(payload?.rulesVersion || "").trim();\n  } catch {\n    return "";\n  }\n}\n\nfunction rewriteCandidatePath(request) {`)
  .replace(`    // The unversioned public Rules Arbiter is deliberately pinned to the recovery baseline.\n    if (\n      url.pathname === "/api/rules" || url.pathname === "/rules" ||\n      url.pathname === "/api/health" || url.pathname === "/health"\n    ) {\n      return worker.fetch(request, env, context);\n    }`, `    // The unversioned public Rules Arbiter follows the current canonical release.\n    if (url.pathname === "/api/health" || url.pathname === "/health") return worker.fetch(request, env, context);\n\n    // Keep explicitly versioned v0.6.1 browser clients functional across the Pages/Worker cutover window.\n    if (url.pathname === "/api/rules" || url.pathname === "/rules") {\n      const requestedVersion = await requestedRulesVersion(request);\n      if (requestedVersion === "v0.6.1") return v061Worker.fetch(request, env, context);\n      return worker.fetch(request, env, context);\n    }`)
  .replace('      const response = await worker.fetch(request, env, context);', '      const response = await v061Worker.fetch(request, env, context);');
syncText('rules-assistant/worker-entry.js', entry);

let widget = read('rules-assistant/widget.js');
widget = widget
  .replace(/import \{\n  buildLocalFallbackAnswer,\n  defaultSourceUrls,\n  loadRulesCorpus,\n  retrieveRules\n\} from \"\.\/local-search\.js\";/, `import { buildLocalFallbackAnswer, retrieveRules } from \"./local-search.js\";\nimport { defaultV063SourceUrls, loadV063RulesCorpus } from \"./v063-public-corpus.js\";`)
  .replace('version: "v0.6.1"', 'version: "v0.6.3"')
  .replace('const urls = defaultSourceUrls(window.location.origin);\n    corpusPromise = loadRulesCorpus({ ...urls })', 'const urls = defaultV063SourceUrls(window.location.origin);\n    corpusPromise = loadV063RulesCorpus({ ...urls })')
  .replaceAll('v0.6.1', 'v0.6.3');
syncText('rules-assistant/widget.js', widget);
finish('Clean v0.6.3 Rules Arbiter Worker');
