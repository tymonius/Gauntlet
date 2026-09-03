import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";
import { defaultV071SourceUrls, loadV071RulesCorpus } from "./v071-public-corpus.js";
import { presentRulesAnswer } from "./answer-presentation.js";

const configuredApiEndpoint = window.GAUNTLET_RULES_ASSISTANT_ENDPOINT || "https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/rules";
const CONFIG = {
  apiEndpoint: configuredApiEndpoint,
  feedbackEndpoint: window.GAUNTLET_RULES_FEEDBACK_ENDPOINT || inferFeedbackEndpoint(configuredApiEndpoint),
  assistantName: "Rules Arbiter",
  version: "v0.7.1",
  maxQuestionLength: 600,
  localResultLimit: 5,
  ...window.GAUNTLET_RULES_ASSISTANT_CONFIG
};

const SUGGESTED_QUESTIONS = [
  "When is an occupied Territory captured?",
  "Where do Gambits and Tactics go?",
  "Can Onward continue after a battle?",
  "How does defender advantage work?"
];

let corpusPromise;

function getCorpus() {
  if (!corpusPromise) {
    const urls = defaultV071SourceUrls(window.location.origin);
    corpusPromise = loadV071RulesCorpus({ ...urls }).catch((error) => {
      corpusPromise = null;
      throw error;
    });
  }
  return corpusPromise;
}

class GauntletRulesAssistant {
  constructor() {
    this.history = [];
    this.busy = false;
    this.isOpen = false;
    this.elements = {};
    this.sessionId = getOrCreateSessionId();
    this.playtestContext = getPlaytestContext();
  }

  mount() {
    if (document.querySelector("[data-gauntlet-rules-assistant]")) return;
    ensureFeedbackStyles();
    this.render();
    this.bindEvents();
  }

  render() {
    const root = document.createElement("div");
    root.className = "ga-rules-assistant";
    root.dataset.gauntletRulesAssistant = "";
    root.innerHTML = `
      <button class="ga-rules-launcher" type="button" aria-label="Open Gauntlet rules assistant" aria-expanded="false">
        <span class="ga-rules-launcher-mark" aria-hidden="true">?</span>
        <span class="ga-rules-launcher-label">Ask the rules</span>
      </button>
      <section class="ga-rules-panel" role="dialog" aria-modal="false" aria-labelledby="ga-rules-title" hidden>
        <header class="ga-rules-header">
          <div class="ga-rules-header-identity">
            <img
              class="ga-rules-chief-justice"
              src="/images/rules-arbiter/chief-justice-rules-arbiter-popup.webp"
              alt="The Chief Justice holding a gavel"
              width="216"
              height="270"
              decoding="async"
            />
            <div class="ga-rules-header-copy">
              <p class="ga-rules-eyebrow">Gauntlet ${escapeHtml(CONFIG.version)}</p>
              <h2 id="ga-rules-title">${escapeHtml(CONFIG.assistantName)}</h2>
            </div>
          </div>
          <button class="ga-rules-close" type="button" aria-label="Close rules assistant">×</button>
        </header>
        <details class="ga-rules-notice">
          <summary>About the Rules Arbiter</summary>
          <p>Answers use the canonical ${escapeHtml(CONFIG.version)} sources. When those rules do not decide a gameplay interaction, the Arbiter issues a clearly labeled provisional ruling for the rest of the current game and logs it for designer review. Questions, answers, citations, ruling status, and optional feedback may be logged to improve the rules and this tool. When opened from a formal playtest session, the sheet serial and session identifier are included automatically. Printed rules and component text remain authoritative over provisional rulings.</p>
        </details>
        <div class="ga-rules-messages" aria-live="polite" aria-label="Rules conversation"></div>
        <div class="ga-rules-suggestions" aria-label="Suggested questions"></div>
        <form class="ga-rules-form">
          <label class="ga-rules-input-label" for="ga-rules-question">Rule question</label>
          <div class="ga-rules-input-row">
            <textarea id="ga-rules-question" rows="2" maxlength="${CONFIG.maxQuestionLength}" placeholder="Ask about a rule, card, Leader, faction, or Territory…" required></textarea>
            <button class="ga-rules-send" type="submit">Ask</button>
          </div>
          <div class="ga-rules-form-meta">
            <span class="ga-rules-status">Ready</span>
            <button class="ga-rules-clear" type="button">Clear</button>
          </div>
        </form>
      </section>
    `;

    document.body.append(root);
    this.elements = {
      root,
      launcher: root.querySelector(".ga-rules-launcher"),
      panel: root.querySelector(".ga-rules-panel"),
      close: root.querySelector(".ga-rules-close"),
      messages: root.querySelector(".ga-rules-messages"),
      suggestions: root.querySelector(".ga-rules-suggestions"),
      form: root.querySelector(".ga-rules-form"),
      input: root.querySelector("textarea"),
      send: root.querySelector(".ga-rules-send"),
      status: root.querySelector(".ga-rules-status"),
      clear: root.querySelector(".ga-rules-clear")
    };

    this.renderWelcome();
    this.renderSuggestions();
  }

  bindEvents() {
    this.elements.launcher.addEventListener("click", () => this.toggle());
    this.elements.close.addEventListener("click", () => this.close());
    this.elements.clear.addEventListener("click", () => this.clear());
    this.elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.ask(this.elements.input.value);
    });
    this.elements.input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        this.elements.form.requestSubmit();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isOpen) this.close();
    });
  }

  renderWelcome() {
    this.elements.messages.innerHTML = "";
    this.appendMessage({
      role: "assistant",
      answer: "Ask me about the v0.7.1 rulebook, cards, Leaders, faction systems, Territories, Gambits, Tactics, battle timing, or victory conditions. If the written rules leave a genuine gap, I will issue a provisional ruling so play can continue.",
      rulingStatus: "welcome",
      sources: []
    });
  }

  renderSuggestions() {
    this.elements.suggestions.innerHTML = "";
    for (const question of SUGGESTED_QUESTIONS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "ga-rules-suggestion";
      button.textContent = question;
      button.addEventListener("click", () => {
        this.open();
        this.elements.input.value = question;
        this.ask(question);
      });
      this.elements.suggestions.append(button);
    }
  }

  open() {
    this.isOpen = true;
    this.elements.panel.hidden = false;
    this.elements.launcher.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => this.elements.root.classList.add("is-open"));
    window.setTimeout(() => this.elements.input.focus(), 120);
  }

  close() {
    this.isOpen = false;
    this.elements.root.classList.remove("is-open");
    this.elements.launcher.setAttribute("aria-expanded", "false");
    window.setTimeout(() => {
      if (!this.isOpen) this.elements.panel.hidden = true;
    }, 180);
    this.elements.launcher.focus();
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  clear() {
    this.history = [];
    this.sessionId = createSessionId();
    storeSessionId(this.sessionId);
    this.renderWelcome();
    this.renderSuggestions();
    this.elements.input.value = "";
    this.setStatus("Ready");
  }

  async ask(rawQuestion) {
    const question = String(rawQuestion || "").trim();
    if (!question || this.busy) return;
    if (question.length > CONFIG.maxQuestionLength) {
      this.setStatus(`Questions are limited to ${CONFIG.maxQuestionLength} characters.`, true);
      return;
    }

    this.open();
    this.busy = true;
    this.elements.send.disabled = true;
    this.elements.input.disabled = true;
    this.elements.suggestions.hidden = true;
    this.elements.input.value = "";
    this.appendMessage({ role: "user", answer: question, sources: [] });
    const loading = this.appendLoadingMessage();
    this.setStatus("Checking canonical sources…");

    try {
      const answer = await this.requestAnswer(question);
      loading.replaceWith(this.createMessageElement({ role: "assistant", ...answer }));
      this.history.push({ role: "user", content: question });
      this.history.push({
        role: "assistant",
        content: answer.answer,
        rulingStatus: answer.rulingStatus || null
      });
      this.history = this.history.slice(-8);
      this.setStatus(formatCompletionStatus(answer));
    } catch (error) {
      console.error(error);
      loading.replaceWith(this.createMessageElement({
        role: "assistant",
        answer: "I could not load the canonical rules sources. Open the site through gauntlet.run or a local web server and try again.",
        rulingStatus: "error",
        confidence: "low",
        sources: []
      }));
      this.setStatus("Rules sources unavailable", true);
    } finally {
      this.busy = false;
      this.elements.send.disabled = false;
      this.elements.input.disabled = false;
      this.elements.input.focus();
      this.scrollToLatest();
    }
  }

  async requestAnswer(question) {
    if (CONFIG.apiEndpoint) {
      try {
        const response = await fetch(CONFIG.apiEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question,
            history: this.history.slice(-6),
            sessionId: this.sessionId,
            rulesVersion: CONFIG.version,
            playtestSessionId: this.playtestContext.sessionId,
            sheetSerial: this.playtestContext.sheetSerial
          })
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload?.answer) return { ...payload, mode: payload.mode || "ai" };
        }
      } catch (error) {
        console.info("Gauntlet AI endpoint unavailable; using local source lookup.", error);
      }
    }

    const corpus = await getCorpus();
    const results = retrieveRules(corpus, question, { limit: CONFIG.localResultLimit });
    return {
      ...buildLocalFallbackAnswer(question, results, corpus.version),
      version: corpus.version,
      mode: "local"
    };
  }

  appendMessage(message) {
    const element = this.createMessageElement(message);
    this.elements.messages.append(element);
    this.scrollToLatest();
    return element;
  }

  appendLoadingMessage() {
    const element = document.createElement("article");
    element.className = "ga-rules-message assistant loading";
    element.innerHTML = `
      <span class="ga-rules-role">${escapeHtml(CONFIG.assistantName)}</span>
      <div class="ga-rules-thinking" aria-label="Looking up rules"><span></span><span></span><span></span></div>
    `;
    this.elements.messages.append(element);
    this.scrollToLatest();
    return element;
  }

  createMessageElement(message) {
    const article = document.createElement("article");
    article.className = `ga-rules-message ${message.role === "user" ? "user" : "assistant"}`;

    const role = document.createElement("span");
    role.className = "ga-rules-role";
    role.textContent = message.role === "user" ? "You" : CONFIG.assistantName;
    article.append(role);

    const presentation = message.role === "user"
      ? { answer: message.answer, details: "" }
      : presentRulesAnswer(message);

    const body = document.createElement("div");
    body.className = "ga-rules-answer";
    appendTextParagraphs(body, presentation.answer);
    article.append(body);

    if (message.role !== "user" && presentation.details) {
      const details = document.createElement("details");
      details.className = "ga-rules-answer-details";
      const summary = document.createElement("summary");
      summary.textContent = "Details and exceptions";
      const detailsBody = document.createElement("div");
      appendTextParagraphs(detailsBody, presentation.details);
      details.append(summary, detailsBody);
      article.append(details);
    }

    if (message.role !== "user" && message.rulingStatus && !["welcome", "error"].includes(message.rulingStatus)) {
      const meta = document.createElement("div");
      meta.className = "ga-rules-ruling-meta";
      const status = document.createElement("span");
      status.textContent = formatStatus(message.rulingStatus);
      meta.append(status);
      if (message.confidence) {
        const confidence = document.createElement("span");
        confidence.textContent = `Confidence: ${message.confidence}`;
        meta.append(confidence);
      }
      article.append(meta);
    }

    if (Array.isArray(message.sources) && message.sources.length) {
      article.append(this.createSources(message.sources));
    }

    if (message.role !== "user" && message.interactionId && CONFIG.feedbackEndpoint) {
      article.append(this.createFeedback(message.interactionId));
    }

    return article;
  }

  createSources(sources) {
    const details = document.createElement("details");
    details.className = "ga-rules-sources";
    const summary = document.createElement("summary");
    summary.textContent = `Sources (${sources.length})`;
    details.append(summary);

    const list = document.createElement("ol");
    for (const source of sources) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = source.sourceUrl || source.url || "#";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = source.title || source.sourcePath || "Canonical source";
      item.append(link);
      if (source.excerpt) {
        const excerpt = document.createElement("p");
        excerpt.textContent = source.excerpt;
        item.append(excerpt);
      }
      list.append(item);
    }
    details.append(list);
    return details;
  }

  createFeedback(interactionId) {
    const section = document.createElement("section");
    section.className = "ga-rules-feedback";
    section.innerHTML = `
      <p>Did this answer your question?</p>
      <div class="ga-rules-feedback-buttons">
        <button type="button" data-rating="yes">Yes</button>
        <button type="button" data-rating="unclear">Unclear</button>
        <button type="button" data-rating="incorrect">Incorrect</button>
      </div>
      <form class="ga-rules-feedback-comment" hidden>
        <label>Optional comment
          <textarea rows="2" maxlength="1200" placeholder="What was unclear or incorrect?"></textarea>
        </label>
        <div>
          <button type="submit">Send feedback</button>
          <button type="button" data-cancel>Cancel</button>
        </div>
      </form>
      <p class="ga-rules-feedback-status" aria-live="polite"></p>
    `;

    let selectedRating = null;
    const buttons = [...section.querySelectorAll("[data-rating]")];
    const form = section.querySelector("form");
    const textarea = section.querySelector("textarea");
    const status = section.querySelector(".ga-rules-feedback-status");

    const finish = (text) => {
      buttons.forEach((button) => { button.disabled = true; });
      form.hidden = true;
      status.textContent = text;
      section.classList.add("is-complete");
    };

    for (const button of buttons) {
      button.addEventListener("click", async () => {
        selectedRating = button.dataset.rating;
        if (selectedRating === "yes") {
          status.textContent = "Sending…";
          try {
            await this.submitFeedback(interactionId, selectedRating, "");
            finish("Thank you.");
          } catch {
            status.textContent = "Feedback could not be saved.";
          }
          return;
        }
        form.hidden = false;
        textarea.focus();
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!selectedRating) return;
      status.textContent = "Sending…";
      try {
        await this.submitFeedback(interactionId, selectedRating, textarea.value);
        finish("Thank you. This answer has been flagged for review.");
      } catch {
        status.textContent = "Feedback could not be saved.";
      }
    });

    form.querySelector("[data-cancel]").addEventListener("click", () => {
      form.hidden = true;
      selectedRating = null;
      textarea.value = "";
    });

    return section;
  }

  async submitFeedback(interactionId, rating, comment) {
    const response = await fetch(CONFIG.feedbackEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        interactionId,
        rating,
        comment: String(comment || "").trim(),
        sessionId: this.sessionId,
        rulesVersion: CONFIG.version,
        playtestSessionId: this.playtestContext.sessionId,
        sheetSerial: this.playtestContext.sheetSerial
      })
    });
    if (!response.ok) throw new Error("Feedback request failed.");
  }

  setStatus(text, isError = false) {
    this.elements.status.textContent = text;
    this.elements.status.classList.toggle("is-error", isError);
  }

  scrollToLatest() {
    requestAnimationFrame(() => {
      this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    });
  }
}

function appendTextParagraphs(container, text) {
  for (const paragraph of String(text || "").split(/\n{2,}/)) {
    const value = paragraph.trim();
    if (!value) continue;
    const p = document.createElement("p");
    p.textContent = value;
    container.append(p);
  }
}

function ensureFeedbackStyles() {
  if (document.querySelector('link[data-gauntlet-rules-feedback-styles]')) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = new URL("./feedback.css", import.meta.url).href;
  link.dataset.gauntletRulesFeedbackStyles = "";
  document.head.append(link);
}

function inferFeedbackEndpoint(apiEndpoint) {
  if (!apiEndpoint) return null;
  try {
    const url = new URL(apiEndpoint, window.location.href);
    url.pathname = url.pathname.replace(/\/(api\/)?rules\/?$/, (match, apiPrefix) => `/${apiPrefix || ""}feedback`);
    return apiEndpoint.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function getPlaytestContext() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = firstValidContextValue([
    params.get("playtestSession"),
    params.get("session"),
    readSessionContext("gauntlet_playtest_session_id")
  ]);
  const sheetSerial = firstValidContextValue([
    params.get("sheet"),
    params.get("serial"),
    readSessionContext("gauntlet_playtest_sheet_serial")
  ]);

  if (sessionId) storeSessionContext("gauntlet_playtest_session_id", sessionId);
  if (sheetSerial) storeSessionContext("gauntlet_playtest_sheet_serial", sheetSerial);
  return { sessionId, sheetSerial };
}

function firstValidContextValue(values) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (/^[a-zA-Z0-9_.:-]{3,120}$/.test(normalized)) return normalized;
  }
  return null;
}

function readSessionContext(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function storeSessionContext(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Formal-session linkage is optional when browser storage is unavailable.
  }
}

function getOrCreateSessionId() {
  const stored = readStoredSessionId();
  if (stored) return stored;
  const created = createSessionId();
  storeSessionId(created);
  return created;
}

function readStoredSessionId() {
  try {
    const value = sessionStorage.getItem("gauntlet_rules_session_id");
    return /^[a-zA-Z0-9_-]{8,80}$/.test(value || "") ? value : null;
  } catch {
    return null;
  }
}

function storeSessionId(value) {
  try {
    sessionStorage.setItem("gauntlet_rules_session_id", value);
  } catch {
    // Session grouping is optional when browser storage is unavailable.
  }
}

function createSessionId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function formatCompletionStatus(answer) {
  if (answer?.mode === "local") return "Source lookup mode";
  return {
    provisional: "Provisional ruling issued",
    out_of_scope: "Question outside gameplay rules",
    explicit: "Explicit rule found",
    inferred: "Rules interpretation complete"
  }[answer?.rulingStatus] || "AI ruling complete";
}

function formatStatus(status) {
  return {
    explicit: "Explicit rule",
    inferred: "Rules interpretation",
    provisional: "Provisional Arbiter Ruling",
    out_of_scope: "Out of scope",
    unresolved: "Unresolved source lookup",
    source_lookup: "Direct source lookup"
  }[status] || status;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  new GauntletRulesAssistant().mount();
});
