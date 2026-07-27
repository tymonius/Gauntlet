const CARD_SOURCES = {
  neutral: {
    label: "Neutral",
    path: "../docs/Gauntlet_v0.6_Neutral_Card_Pool.md",
    headingLevel: 2
  },
  military: {
    label: "Military",
    path: "../releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md",
    start: "# 6. Canonical Military card pool",
    end: "# 7. Card-pool summary",
    headingLevel: 2
  },
  diplomats: {
    label: "Diplomats",
    path: "../releases/v0.6.0/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md",
    start: "# 6. Canonical card pool",
    end: "# 7. Card-pool summary",
    headingLevel: 2
  },
  financiers: {
    label: "Financiers",
    path: "../releases/v0.6.0/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md",
    start: "## 6. Canonical Financier card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  },
  intelligence: {
    label: "Intelligence",
    path: "../releases/v0.6.0/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md",
    start: "# 6. Canonical Intelligence card pool",
    end: "# 7. Card-pool summary",
    headingLevel: 2
  },
  mystics: {
    label: "Mystics",
    path: "../releases/v0.6.0/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md",
    start: "## 7. Canonical Mystics card pool",
    end: "## 8. Package summary and development watchlist",
    headingLevel: 3
  },
  inquisition: {
    label: "Inquisition",
    path: "../releases/v0.6.0/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md",
    start: "## 6. Canonical Inquisition card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  }
};

const TERRITORY_SOURCE = "../docs/Gauntlet_v0.6_Territory_Pool.md";

const state = {
  entries: [],
  query: "",
  type: "all",
  faction: "all",
  cost: "all",
  selectedId: null
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();

  try {
    const [cardPools, territories] = await Promise.all([
      Promise.all(Object.entries(CARD_SOURCES).map(loadCardSource)),
      loadTerritories()
    ]);

    state.entries = [...cardPools.flat(), ...territories].sort(sortEntries);
    applyHashSelection();

    const cardCount = state.entries.filter(entry => entry.type === "card").length;
    el.cardTotal.textContent = cardCount;
    el.territoryTotal.textContent = territories.length;
    el.dataStatus.textContent = `${cardCount} playable cards + ${territories.length} Territories loaded`;
    el.app.hidden = false;
    render();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = "Source load failed";
    document.body.insertAdjacentHTML(
      "beforeend",
      '<p class="noscript">Unable to load the canonical v0.6.0 sources. Serve the repository through a web server rather than opening this file directly.</p>'
    );
  }
}

function cacheElements() {
  for (const id of [
    "app", "dataStatus", "filters", "searchInput", "typeFilter", "factionFilter",
    "costFilter", "clearFilters", "cardTotal", "territoryTotal", "resultCount",
    "resultSummary", "resultList", "preview"
  ]) el[id] = document.getElementById(id);
}

function bindEvents() {
  el.filters.addEventListener("submit", event => event.preventDefault());
  el.searchInput.addEventListener("input", () => {
    state.query = el.searchInput.value.trim().toLowerCase();
    render();
  });
  el.typeFilter.addEventListener("change", () => {
    state.type = el.typeFilter.value;
    syncFilterAvailability();
    render();
  });
  el.factionFilter.addEventListener("change", () => {
    state.faction = el.factionFilter.value;
    render();
  });
  el.costFilter.addEventListener("change", () => {
    state.cost = el.costFilter.value;
    render();
  });
  el.clearFilters.addEventListener("click", clearFilters);
  window.addEventListener("hashchange", () => {
    applyHashSelection();
    render();
  });
}

async function loadCardSource([faction, source]) {
  const response = await fetch(source.path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${source.path}: ${response.status}`);
  return parseCardPool(await response.text(), faction, source);
}

async function loadTerritories() {
  const response = await fetch(TERRITORY_SOURCE, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${TERRITORY_SOURCE}: ${response.status}`);
  return parseTerritoryPool(await response.text());
}

function parseCardPool(markdown, faction, source) {
  let section = markdown.replace(/\r/g, "");
  if (source.start) {
    const start = section.indexOf(source.start);
    if (start >= 0) section = section.slice(start + source.start.length);
  }
  if (source.end) {
    const end = section.indexOf(source.end);
    if (end >= 0) section = section.slice(0, end);
  }

  const headingLevel = source.headingLevel || 2;
  const headings = [...section.matchAll(new RegExp(`^#{${headingLevel}}\\s+(.+)$`, "gm"))];

  return headings.flatMap((match, index) => {
    const name = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : section.length;
    const block = section.slice(start, end);
    const costMatch = block.match(/\*\*Cost:\*\*\s*(\d+)/i);
    if (!costMatch) return [];

    return [{
      id: `${faction}-${slugify(name)}`,
      type: "card",
      name,
      faction,
      factionLabel: source.label,
      cost: Number(costMatch[1]),
      trait: metadataValue(block, "Trait") || "",
      form: metadataValue(block, "Card form") || "",
      unique: /\*\*Unique:\*\*/i.test(block),
      sections: parseQuotedSections(block),
      source: source.path
    }];
  });
}

function parseTerritoryPool(markdown) {
  const source = markdown.replace(/\r/g, "");
  const headings = [...source.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm)];

  return headings.map((match, index) => {
    const name = match[2].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : source.length;
    const block = source.slice(start, end);

    return {
      id: `territory-${slugify(name)}`,
      type: "territory",
      name,
      faction: "territory",
      factionLabel: name.startsWith("Arena:") ? "Arena" : "Territory",
      arena: name.startsWith("Arena:"),
      status: metadataValue(block, "Status") || "Approved",
      watchlist: metadataValue(block, "Watchlist") || "None",
      sections: {
        Effect: block.split("\n")
          .filter(line => line.trim().startsWith(">"))
          .map(line => cleanInlineMarkdown(line.trim().replace(/^>\s?/, "")))
          .filter(Boolean)
          .join("\n")
      },
      source: TERRITORY_SOURCE
    };
  });
}

function metadataValue(block, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return block.match(new RegExp(`\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)`, "i"))?.[1].trim() || "";
}

function parseQuotedSections(block) {
  const result = {};
  let current = "Text";

  for (const rawLine of block.split("\n")) {
    if (!rawLine.trim().startsWith(">")) continue;
    let line = rawLine.trim().replace(/^>\s?/, "").trim();
    if (!line) continue;

    const label = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (label) {
      current = label[1].trim();
      line = label[2].trim();
      if (!result[current]) result[current] = [];
      if (line) result[current].push(cleanInlineMarkdown(line));
      continue;
    }

    if (!result[current]) result[current] = [];
    result[current].push(cleanInlineMarkdown(line));
  }

  return Object.fromEntries(Object.entries(result).map(([key, lines]) => [key, lines.join("\n")]));
}

function cleanInlineMarkdown(text) {
  return text
    .replace(/^[-*]\s+/, "• ")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .trim();
}

function clearFilters() {
  state.query = "";
  state.type = "all";
  state.faction = "all";
  state.cost = "all";
  el.searchInput.value = "";
  el.typeFilter.value = "all";
  el.factionFilter.value = "all";
  el.costFilter.value = "all";
  syncFilterAvailability();
  render();
}

function syncFilterAvailability() {
  const territoriesOnly = state.type === "territory";
  if (territoriesOnly) {
    state.faction = "all";
    state.cost = "all";
    el.factionFilter.value = "all";
    el.costFilter.value = "all";
  }
  el.factionFilter.disabled = territoriesOnly;
  el.costFilter.disabled = territoriesOnly;
}

function filteredEntries() {
  return state.entries.filter(entry => {
    if (state.type !== "all" && entry.type !== state.type) return false;
    if (state.faction !== "all" && (entry.type !== "card" || entry.faction !== state.faction)) return false;
    if (state.cost !== "all" && (entry.type !== "card" || entry.cost !== Number(state.cost))) return false;
    if (!state.query) return true;

    const searchable = [
      entry.name,
      entry.factionLabel,
      entry.trait || "",
      entry.form || "",
      entry.watchlist || "",
      ...Object.keys(entry.sections),
      ...Object.values(entry.sections)
    ].join(" ").toLowerCase();

    return searchable.includes(state.query);
  });
}

function render() {
  const entries = filteredEntries();
  el.resultCount.textContent = entries.length;
  el.resultSummary.textContent = buildResultSummary();

  if (!entries.length) {
    el.resultList.className = "reference-list empty-state";
    el.resultList.textContent = "No cards or Territories match the current filters.";
    renderPreview(null);
    return;
  }

  el.resultList.className = "reference-list";
  if (!entries.some(entry => entry.id === state.selectedId)) state.selectedId = entries[0].id;
  el.resultList.innerHTML = "";

  entries.forEach(entry => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = `reference-row${entry.id === state.selectedId ? " selected" : ""}`;
    row.dataset.faction = entry.faction;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(entry.id === state.selectedId));
    row.innerHTML = `
      <span>
        <span class="reference-row-title">${escapeHtml(entry.name)}</span>
        <span class="reference-row-meta">
          <span class="pill">${escapeHtml(entry.factionLabel)}</span>
          ${entry.type === "card" ? `<span class="pill">Cost ${entry.cost}</span>` : ""}
        </span>
      </span>
      <span class="reference-row-arrow" aria-hidden="true">›</span>
    `;
    row.addEventListener("click", () => selectEntry(entry.id));
    el.resultList.append(row);
  });

  renderPreview(state.entries.find(entry => entry.id === state.selectedId));
}

function buildResultSummary() {
  const parts = [];
  if (state.query) parts.push(`matching “${state.query}”`);
  if (state.type !== "all") parts.push(state.type === "card" ? "playable cards only" : "Territories only");
  if (state.faction !== "all") parts.push(CARD_SOURCES[state.faction]?.label || state.faction);
  if (state.cost !== "all") parts.push(`cost ${state.cost}`);
  return parts.length ? parts.join(" · ") : "All canonical playable cards and Territories.";
}

function selectEntry(id) {
  state.selectedId = id;
  const nextHash = `#${encodeURIComponent(id)}`;
  if (window.location.hash !== nextHash) history.replaceState(null, "", nextHash);
  render();

  if (window.matchMedia("(max-width: 700px)").matches) {
    requestAnimationFrame(() => el.preview.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
}

function applyHashSelection() {
  const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  if (!id || !state.entries.some(entry => entry.id === id)) return;
  state.selectedId = id;
}

function renderPreview(entry) {
  if (!entry) {
    el.preview.className = "reference-preview empty-state";
    delete el.preview.dataset.faction;
    el.preview.textContent = "Select a result to view its canonical text.";
    return;
  }

  el.preview.className = "reference-preview";
  el.preview.dataset.faction = entry.faction;
  el.preview.innerHTML = `
    <p class="preview-kicker">${entry.type === "territory" ? "Territory reference" : `${escapeHtml(entry.factionLabel)} card`}</p>
    <h3>${escapeHtml(entry.name)}</h3>
    <div class="preview-meta">
      ${entry.type === "card" ? `<span class="pill">Cost ${entry.cost}</span>` : `<span class="pill">${entry.arena ? "Arena" : "Territory"}</span>`}
      <span class="pill">${escapeHtml(entry.factionLabel)}</span>
      ${entry.form ? `<span class="pill">${escapeHtml(entry.form)}</span>` : ""}
      ${entry.trait ? `<span class="pill">${escapeHtml(entry.trait)} trait</span>` : ""}
      ${entry.unique ? '<span class="pill">Unique</span>' : ""}
      ${entry.status && entry.status !== "Approved" ? `<span class="pill">${escapeHtml(entry.status)}</span>` : ""}
    </div>
    ${Object.entries(entry.sections).map(([label, text]) => `
      <section class="card-text-section">
        <div class="card-text-label">${escapeHtml(label)}</div>
        <p>${escapeHtml(text)}</p>
      </section>
    `).join("")}
    ${entry.watchlist && entry.watchlist !== "None" ? `
      <section class="card-text-section">
        <div class="card-text-label">Playtest watchlist</div>
        <p>${escapeHtml(entry.watchlist)}</p>
      </section>
    ` : ""}
    <div class="preview-actions">
      <button id="copyLink" class="button secondary" type="button">Copy direct link</button>
      <a class="button secondary" href="${escapeHtml(entry.source)}">View canonical source</a>
    </div>
    <p class="preview-source">This reference reads the canonical Markdown source at page load, so card updates appear here without maintaining a separate card database.</p>
  `;

  document.getElementById("copyLink")?.addEventListener("click", copyDirectLink);
}

async function copyDirectLink(event) {
  try {
    await navigator.clipboard.writeText(window.location.href);
    const button = event.currentTarget;
    const original = button.textContent;
    button.textContent = "Link copied";
    window.setTimeout(() => { button.textContent = original; }, 1400);
  } catch (error) {
    console.error(error);
    window.prompt("Copy this direct link:", window.location.href);
  }
}

function sortEntries(a, b) {
  if (a.type !== b.type) return a.type === "card" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function slugify(value) {
  return value.toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
