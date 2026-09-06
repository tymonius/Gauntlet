import { buildLocalFallbackAnswer, retrieveRules } from "../rules-assistant/local-search.js";
import {
  V071_RULES_VERSION as RULES_VERSION,
  V071_VERSION_LABEL as VERSION_LABEL,
  defaultV071SourceUrls,
  loadV071RulesCorpus
} from "../rules-assistant/v071-public-corpus.js";

const CURRENT_PUBLIC_RELEASE = "v0.7.1";
const endpoint = String(window.GAUNTLET_RULES_ASSISTANT_ENDPOINT || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules").trim();
const form = document.getElementById("arbiterForm");
const input = document.getElementById("question");
const answer = document.getElementById("answer");
const status = document.getElementById("arbiterStatus");
const suggestions = document.querySelectorAll("[data-question]");
const submitButton = form?.querySelector('button[type="submit"]');
const READY_STATUS = endpoint
  ? "Connected to the Chief Justice; current v0.7.1 local Rulebook lookup is available as a fallback."
  : "Current v0.7.1 local Rulebook lookup mode.";

let corpusPromise;
let history = [];
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
  status.textContent = "Checking the current v0.7.1 rules…";
  if (restoreInputFocus) status.focus({ preventScroll: true });
  setBusy(true);
  answer.innerHTML = "";
  try {
    const result = endpoint ? await askRemote(question) : await askLocal(question);
    renderAnswer(result);
    history = [
      ...history,
      { role: "user", content: question },
      {
        role: "assistant",
        content: result.answer,
        rulingStatus: result.rulingStatus || null
      }
    ].slice(-12);
  } catch (error) {
    answer.innerHTML = `<p class="arbiter-error"><strong>Chief Justice unavailable.</strong> ${escapeHtml(error.message)}</p>`;
  } finally {
    setBusy(false);
    status.textContent = READY_STATUS;
    if (restoreInputFocus) input.focus({ preventScroll: true });
  }
});

status.textContent = READY_STATUS;

async function askLocal(question) {
  const corpus = await getCorpus();
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 8, excerptLength: 1100 });
  const fallback = buildLocalFallbackAnswer(question, retrieval, RULES_VERSION);
  return {
    ...fallback,
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
    return payload;
  } catch (error) {
    console.warn("Production Rules Arbiter unavailable; using local Rulebook lookup.", error);
    return askLocal(question);
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

function renderAnswer(result) {
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const label = rulingLabel(result.rulingStatus);
  answer.innerHTML = `
    <div class="arbiter-ruling">
      <p class="arbiter-meta"><strong>${escapeHtml(label)}</strong> · ${escapeHtml(result.executionPath || "rules lookup")}</p>
      <p>${escapeHtml(result.answer).replaceAll("\n", "<br>")}</p>
      ${sources.length ? `<h2 class="arbiter-sources-heading">Sources</h2><ol>${sources.map(sourceItem).join("")}</ol>` : ""}
      <p class="arbiter-boundary">Current ${escapeHtml(result.versionLabel || VERSION_LABEL)} rules sources.</p>
    </div>`;
}

function sourceItem(source) {
  const href = source.sourceUrl || "../rulebook/";
  const excerpt = source.excerpt || source.body || "";
  return `<li><a href="${escapeHtml(href)}">${escapeHtml(source.title || "Rulebook source")}</a>${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}</li>`;
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
