import { buildLocalFallbackAnswer, retrieveRules } from "../../../../rules-assistant/local-search.js";
import {
  CLEAN_V063_RULES_VERSION,
  CLEAN_V063_VERSION_LABEL,
  defaultCleanV063SourceUrls,
  loadCleanV063RulesCorpus
} from "./corpus.js";

const endpoint = String(window.GAUNTLET_CLEAN_V063_RULES_ARBITER_ENDPOINT || "").trim();
const form = document.getElementById("arbiterForm");
const input = document.getElementById("question");
const answer = document.getElementById("answer");
const status = document.getElementById("arbiterStatus");
const suggestions = document.querySelectorAll("[data-question]");
const submitButton = form?.querySelector('button[type="submit"]');

let corpusPromise;
let history = [];
const sessionId = getSessionId();

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
    answer.innerHTML = `<p class="arbiter-error"><strong>Reconstruction Arbiter unavailable.</strong> ${escapeHtml(error.message)}</p>`;
  } finally {
    setBusy(false);
  }
});

status.textContent = endpoint
  ? "Isolated reconstruction worker configured; clean local source lookup remains the fallback."
  : "Clean local source-lookup mode. No production Rules Arbiter endpoint is used.";

async function askLocal(question) {
  const corpus = await getCorpus();
  const query = contextualQuery(question, history);
  const retrieval = retrieveRules(corpus, query, { limit: 8, excerptLength: 1100 });
  const fallback = buildLocalFallbackAnswer(question, retrieval, CLEAN_V063_RULES_VERSION);
  return {
    ...fallback,
    responseType: "source_lookup",
    executionPath: "local-source-lookup",
    version: CLEAN_V063_RULES_VERSION,
    versionLabel: CLEAN_V063_VERSION_LABEL,
    reconstruction: true,
    currentPublicRelease: "v0.6.1"
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
        rulesVersion: CLEAN_V063_RULES_VERSION
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `Reconstruction worker returned ${response.status}.`);
    }
    if (payload.version !== CLEAN_V063_RULES_VERSION || payload.reconstruction !== true) {
      throw new Error("Configured endpoint did not identify itself as the clean v0.6.3 reconstruction Rules Arbiter.");
    }
    return payload;
  } catch (error) {
    console.warn("Reconstruction worker unavailable; using clean local source lookup.", error);
    return askLocal(question);
  }
}

async function getCorpus() {
  if (!corpusPromise) {
    const urls = defaultCleanV063SourceUrls(window.location.origin);
    corpusPromise = loadCleanV063RulesCorpus({
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
      <p class="arbiter-meta"><strong>${escapeHtml(label)}</strong> · ${escapeHtml(result.executionPath || "reconstruction")}</p>
      <p>${escapeHtml(result.answer).replaceAll("\n", "<br>")}</p>
      ${sources.length ? `<h3>Clean sources</h3><ol>${sources.map(sourceItem).join("")}</ol>` : ""}
      <p class="arbiter-boundary">This answer uses the clean-v0.6.3 reconstruction authority. It is a downstream review surface, not the current public release.</p>
    </div>`;
}

function sourceItem(source) {
  const href = source.sourceUrl || "../browser-rulebook/";
  const excerpt = source.excerpt || source.body || "";
  return `<li><a href="${escapeHtml(href)}">${escapeHtml(source.title || "Clean source")}</a>${excerpt ? `<p>${escapeHtml(excerpt)}</p>` : ""}</li>`;
}

function rulingLabel(value) {
  const statusValue = String(value || "source_lookup").toLowerCase();
  if (statusValue === "explicit") return "Explicit Rule";
  if (statusValue === "inferred") return "Rules Interpretation";
  if (statusValue === "provisional") return "Provisional Arbiter Ruling";
  if (statusValue === "out_of_scope") return "Out of Scope";
  return "Source lookup";
}

function setBusy(busy) {
  input.disabled = busy;
  submitButton.disabled = busy;
  submitButton.textContent = busy ? "Checking…" : "Ask the reconstruction Arbiter";
}

function getSessionId() {
  const key = "gauntlet-clean-v063-arbiter-session";
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
