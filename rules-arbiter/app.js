import { buildLocalFallbackAnswer, retrieveRules } from "../rules-assistant/local-search.js";
import {
  V071_RULES_VERSION as RULES_VERSION,
  V071_VERSION_LABEL as VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "../rules-assistant/v071-public-corpus.js";

const CURRENT_PUBLIC_RELEASE = "v0.7.1";
const endpoint = String(window.GAUNTLET_RULES_ASSISTANT_ENDPOINT || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules").trim();
const sourceLookupReviewEndpoint = endpoint ? new URL("/api/source-lookup-review", endpoint).href : "";
const form = document.getElementById("arbiterForm");
const input = document.getElementById("question");
const answer = document.getElementById("answer");
const status = document.getElementById("arbiterStatus");
const suggestions = document.querySelectorAll("[data-question]");
const submitButton = form?.querySelector('button[type="submit"]');
const READY_STATUS = endpoint
  ? "Connected to the Chief Justice; current v0.7.1 local Rulebook lookup is available as a fallback."
  : "Current v0.7.1 local Rulebook lookup mode.";
const FALLBACK_STATUS = "AI ruling service unavailable or at capacity; canonical v0.7.1 source lookup remains available.";
const SOURCE_LOOKUP_MESSAGE = "The AI ruling service is unavailable. The closest matching canonical v0.7.1 passages are shown below; this is source lookup, not an interpreted ruling.";
const SOURCE_LOOKUP_REVIEW_QUEUE_KEY = "gauntlet-v071-source-lookup-review-queue";
const SOURCE_LOOKUP_REVIEW_QUEUE_LIMIT = 20;

let corpusPromise;
let history = [];
let fallbackReviewFlushPromise = null;
const sessionId = getSessionId();

status.tabIndex = -1;

for (const button of suggestions) {
  button.addEventListener("click", () => {
    input.value = button.dataset.question || "";
    input.focus();
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const question = input.value.trim();
  if (!question) return;

  const restoreInputFocus = form.contains(document.activeElement);
  let completionStatus = READY_STATUS;
  status.textContent = "Checking the current v0.7.1 rules…";
  if (restoreInputFocus) status.focus({ preventScroll: true });
  setBusy(true);
  answer.innerHTML = "";
  try {
    const result = endpoint ? await askRemote(question) : await askLocal(question);
    renderAnswer(result);
    if (isFallbackResult(result)) completionStatus = FALLBACK_STATUS;
    history = [
      ...history,
      { role: "user", content: question },
      {
        role: "assistant",
        content: playerFacingAnswer(result),
        rulingStatus: result.rulingStatus || null
      }
    ].slice(-12);
  } catch (error) {
    completionStatus = "Chief Justice unavailable; reload the page or use the Browser Rulebook while service recovers.";
    answer.innerHTML = `<p class="arbiter-error"><strong>Chief Justice unavailable.</strong> ${escapeHtml(error.message)}</p>`;
  } finally {
    setBusy(false);
    status.textContent = completionStatus;
    if (restoreInputFocus) input.focus({ preventScroll: true });
  }
});

status.textContent = READY_STATUS;
void flushFallbackReviewQueue();

async function askLocal(question) {
  const corpus = await getCorpus();
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 8, excerptLength: 1100 });
  const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
  return {
    ...fallback,
    answer: fallback.sources?.length ? SOURCE_LOOKUP_MESSAGE : fallback.answer,
    sources: sanitizeSources(fallback.sources),
    responseType: "source_lookup",
    executionPath: "local source lookup",
    version: RULES_VERSION,
    versionLabel: VERSION_LABEL,
    reconstruction: false,
    published: true,
    currentPublicRelease: CURRENT_PUBLIC_RELEASE
  };
}

async function askRemote(question) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        history,
        sessionId,
        rulesVersion: RULES_VERSION
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Rules Arbiter returned ${response.status}.`);
    }
    if (
      payload.version !== RULES_VERSION ||
      payload.published !== true ||
      payload.reconstruction !== false ||
      payload.currentPublicRelease !== CURRENT_PUBLIC_RELEASE
    ) {
      throw new Error("Configured endpoint did not identify itself as the current v0.7.1 Rules Arbiter.");
    }
    void flushFallbackReviewQueue();
    return payload;
  } catch (error) {
    console.warn("Production Rules Arbiter unavailable; using local Rulebook lookup.", error);
    const fallback = await askLocal(question);
    queueFallbackReview(question, fallback);
    void flushFallbackReviewQueue();
    return fallback;
  }
}

async function getCorpus() {
  if (!corpusPromise) {
    const urls = defaultV071SourceUrls(window.location.origin);
    corpusPromise = loadV071RulesCorpus({
      ...urls,
      fetchImpl: window.fetch.bind(window)
    });
  }
  return corpusPromise;
}

function contextualQuery(question, items) {
  const prior = items.slice(-4).map((item) => item.content).join(" ");
  return prior ? `${prior} ${question}` : question;
}

function isFallbackResult(result) {
  const path = String(result?.executionPath || "").toLowerCase();
  return path.includes("fallback") || path.includes("source lookup");
}

function playerFacingAnswer(result) {
  if (isFallbackResult(result) && Array.isArray(result?.sources) && result.sources.length) {
    return SOURCE_LOOKUP_MESSAGE;
  }
  return String(result?.answer || "");
}

function renderAnswer(result) {
  const sources = sanitizeSources(result.sources);
  const label = rulingLabel(result.rulingStatus);
  const displayAnswer = playerFacingAnswer(result);
  answer.innerHTML = `
    <div class="arbiter-ruling">
      <p class="arbiter-meta"><strong>${escapeHtml(label)}</strong> · ${escapeHtml(result.executionPath || "rules lookup")}</p>
      <p>${escapeHtml(displayAnswer).replaceAll("\n", "<br>")}</p>
      ${sources.length ? `<h2 class="arbiter-sources-heading">Sources</h2><ol>${sources.map(sourceItem).join("")}</ol>` : ""}
      <p class="arbiter-boundary">Current ${escapeHtml(result.versionLabel || VERSION_LABEL)} rules sources.</p>
    </div>`;
}

function sourceItem(source) {
  const href = source.sourceUrl || "../rulebook/";
  const excerpt = sanitizeSourceText(source.excerpt || source.body || "");
  return `<li><a href="${escapeHtml(href)}">${escapeHtml(source.title || "Rulebook source")}</a>${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}</li>`;
}

function sanitizeSources(sources) {
  return (Array.isArray(sources) ? sources : []).slice(0, 8).map((source) => ({
    ...source,
    title: sanitizeSourceText(source?.title || "Rulebook source"),
    excerpt: sanitizeSourceText(source?.excerpt || source?.body || ""),
    body: sanitizeSourceText(source?.body || "")
  }));
}

function sanitizeSourceText(value) {
  return String(value || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<![^>]*>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function queueFallbackReview(question, result) {
  if (!sourceLookupReviewEndpoint) return;
  const queue = readFallbackReviewQueue();
  queue.push({
    rulesVersion: RULES_VERSION,
    sessionId,
    question: String(question || "").slice(0, 2000),
    answer: playerFacingAnswer(result).slice(0, 4000),
    sources: sanitizeSources(result?.sources).map(({ id, canonicalId, title, sourcePath, sourceUrl, excerpt }) => ({
      id: id || canonicalId || "",
      title,
      sourcePath: sourcePath || "",
      sourceUrl: sourceUrl || "",
      excerpt
    }))
  });
  writeFallbackReviewQueue(queue.slice(-SOURCE_LOOKUP_REVIEW_QUEUE_LIMIT));
}

function readFallbackReviewQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SOURCE_LOOKUP_REVIEW_QUEUE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(-SOURCE_LOOKUP_REVIEW_QUEUE_LIMIT) : [];
  } catch {
    return [];
  }
}

function writeFallbackReviewQueue(queue) {
  try {
    if (queue.length) localStorage.setItem(SOURCE_LOOKUP_REVIEW_QUEUE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(SOURCE_LOOKUP_REVIEW_QUEUE_KEY);
  } catch {
  }
}

async function flushFallbackReviewQueue() {
  if (!sourceLookupReviewEndpoint) return;
  if (fallbackReviewFlushPromise) return fallbackReviewFlushPromise;

  fallbackReviewFlushPromise = (async () => {
    const queue = readFallbackReviewQueue();
    while (queue.length) {
      try {
        const response = await fetch(sourceLookupReviewEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(queue[0])
        });
        if (!response.ok) break;
        queue.shift();
        writeFallbackReviewQueue(queue);
      } catch {
        break;
      }
    }
  })().finally(() => {
    fallbackReviewFlushPromise = null;
  });

  return fallbackReviewFlushPromise;
}

function rulingLabel(value) {
  const statusValue = String(value || "source_lookup").toLowerCase();
  if (statusValue === "explicit") return "Explicit Rule";
  if (statusValue === "inferred") return "Rules Interpretation";
  if (statusValue === "provisional") return "Provisional Ruling";
  if (statusValue === "out_of_scope") return "Out of Scope";
  return "Source lookup";
}

function setBusy(busy) {
  input.disabled = busy;
  submitButton.disabled = busy;
  submitButton.textContent = busy ? "Checking…" : "Ask the Chief Justice";
}

function getSessionId() {
  const key = "gauntlet-v071-arbiter-session";
  try {
    const existing = localStorage.getItem(key);
    if (/^[a-zA-Z0-9_-]{8,80}$/.test(existing || "")) return existing;
    const created = crypto.randomUUID().replaceAll("-", "");
    localStorage.setItem(key, created);
    return created;
  } catch {
    return crypto.randomUUID().replaceAll("-", "");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
