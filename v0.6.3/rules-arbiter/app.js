import { buildLocalFallbackAnswer, retrieveRules } from "../../rules-assistant/local-search.js";
import { defaultPublishedV063SourceUrls, loadPublishedV063RulesCorpus, V063_PUBLISHED_VERSION } from "../../rules-assistant/v063-published-corpus.js";
import {
  materializeV063DeterministicSources,
  resolveV063DeterministicRuling
} from "../../rules-assistant/rules-deterministic-v063.js";

const endpoint = String(window.GAUNTLET_V063_RULES_ASSISTANT_ENDPOINT || "").trim();
const form = document.getElementById("arbiterForm");
const input = document.getElementById("question");
const answer = document.getElementById("answer");
const status = document.getElementById("arbiterStatus");
const suggestions = document.querySelectorAll("[data-question]");
let corpusPromise;
let history = [];

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
    history = [...history, { role: "user", content: question }, { role: "assistant", content: result.answer }].slice(-6);
  } catch (error) {
    answer.innerHTML = `<p class="arbiter-error"><strong>Rules Arbiter unavailable.</strong> ${escapeHtml(error.message)}</p>`;
  } finally {
    setBusy(false);
  }
});

status.textContent = endpoint
  ? "Published worker configured; local published corpus remains the fallback."
  : "Local published corpus mode.";

async function askLocal(question) {
  const corpus = await getCorpus();
  const deterministic = resolveV063DeterministicRuling({ question, history });
  if (deterministic) {
    return {
      ...deterministic,
      sources: materializeV063DeterministicSources(corpus, deterministic),
      executionPath: "deterministic-local",
      version: V063_PUBLISHED_VERSION,
      candidate: false,
      publishedVersion: "v0.6.3"
    };
  }
  const query = [...history.slice(-2).map((item) => item.content), question].join(" ");
  const retrieval = retrieveRules(corpus, query, { limit: 8, excerptLength: 1000 });
  const fallback = buildLocalFallbackAnswer(question, retrieval, V063_PUBLISHED_VERSION);
  return {
    ...fallback,
    responseType: "source_lookup",
    executionPath: "local-source-lookup",
    version: V063_PUBLISHED_VERSION,
    candidate: false,
    publishedVersion: "v0.6.3"
  };
}

async function askRemote(question) {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history, rulesVersion: V063_PUBLISHED_VERSION })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Rules worker returned ${response.status}.`);
    if (payload.version !== V063_PUBLISHED_VERSION || payload.candidate !== false) {
      throw new Error("Configured endpoint did not identify itself as the v0.6.3 Rules Arbiter.");
    }
    return payload;
  } catch (error) {
    console.warn("Rules worker unavailable; using local published corpus.", error);
    return askLocal(question);
  }
}

async function getCorpus() {
  if (!corpusPromise) {
    const urls = defaultPublishedV063SourceUrls(window.location.origin);
    corpusPromise = loadPublishedV063RulesCorpus({ ...urls, fetchImpl: window.fetch.bind(window) });
  }
  return corpusPromise;
}

function renderAnswer(result) {
  const sources = Array.isArray(result.sources) ? result.sources : [];
  const label = rulingLabel(result.rulingStatus);
  answer.innerHTML = `
    <div class="arbiter-ruling">
      <p class="arbiter-meta"><strong>${escapeHtml(label)}</strong> · ${escapeHtml(result.executionPath || "candidate")}</p>
      <p>${escapeHtml(result.answer).replaceAll("\n", "<br>")}</p>
      ${sources.length ? `<h3>Canonical sources</h3><ol>${sources.map(sourceItem).join("")}</ol>` : ""}
      <p class="arbiter-boundary">This answer uses the published v0.6.3 canonical rules sources.</p>
    </div>`;
}

function sourceItem(source) {
  const href = source.sourceUrl || "../rulebook/";
  return `<li><a href="${escapeHtml(href)}">${escapeHtml(source.title || "Candidate source")}</a>${source.excerpt ? `<p>${escapeHtml(source.excerpt)}</p>` : ""}</li>`;
}
function rulingLabel(statusValue) {
  const value = String(statusValue || "inferred").toLowerCase();
  if (value === "explicit") return "Explicit candidate rule";
  if (value === "provisional") return "Provisional candidate ruling";
  if (value === "out_of_scope") return "Out of scope";
  return "Candidate clarification";
}
function setBusy(busy) {
  input.disabled = busy;
  form.querySelector("button[type=submit]").disabled = busy;
  form.querySelector("button[type=submit]").textContent = busy ? "Checking…" : "Ask the candidate Arbiter";
}
function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
