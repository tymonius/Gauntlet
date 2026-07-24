import {
  buildLocalFallbackAnswer,
  defaultSourceUrls,
  loadRulesCorpus,
  retrieveRules
} from "./local-search.js";

const CONFIG = {
  apiEndpoint: window.GAUNTLET_RULES_ASSISTANT_ENDPOINT || "/api/rules",
  assistantName: "Rules Arbiter",
  version: "v0.6.0",
  maxQuestionLength: 600,
  localResultLimit: 5,
  ...window.GAUNTLET_RULES_ASSISTANT_CONFIG
};

const SUGGESTED_QUESTIONS = [
  "When is an occupied Territory captured?",
  "What happens to cards used in battle?",
  "Can Onward continue after a battle?",
  "How does defender advantage work?"
];

let corpusPromise;

function getCorpus() {
  if (!corpusPromise) {
    const urls = defaultSourceUrls(window.location.origin);
    corpusPromise = loadRulesCorpus({ ...urls }).catch((error) => {
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
  }

  mount() {
    if (document.querySelector("[data-gauntlet-rules-assistant]")) return;
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
          <div>
            <p class="ga-rules-eyebrow">Gauntlet ${escapeHtml(CONFIG.version)}</p>
            <h2 id="ga-rules-title">${escapeHtml(CONFIG.assistantName)}</h2>
          </div>
          <button class="ga-rules-close" type="button" aria-label="Close rules assistant">×</button>
        </header>
        <div class="ga-rules-notice">
          Answers are grounded in the canonical ${escapeHtml(CONFIG.version)} sources. Printed rules and component text remain authoritative.
        </div>
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
      answer: "Ask me about the v0.6.0 rulebook, cards, Leaders, faction systems, Territories, battle timing, or victory conditions.",
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
      this.history.push({ role: "assistant", content: answer.answer });
      this.history = this.history.slice(-8);
      this.setStatus(answer.mode === "local" ? "Source lookup mode" : "AI ruling complete");
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
          body: JSON.stringify({ question, history: this.history.slice(-6) })
        });
        if (response.ok) {
          const payload = await response.json();
          if (payload?.answer) return { ...payload, mode: "ai" };
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

    const body = document.createElement("div");
    body.className = "ga-rules-answer";
    for (const paragraph of String(message.answer || "").split(/\n{2,}/)) {
      const p = document.createElement("p");
      p.textContent = paragraph.trim();
      body.append(p);
    }
    article.append(body);

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

function formatStatus(status) {
  return {
    explicit: "Explicit rule",
    inferred: "Interpretation",
    unresolved: "Unresolved",
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
