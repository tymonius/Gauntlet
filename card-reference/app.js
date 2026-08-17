const CANONICAL_DATA_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
const PUBLIC_DATA_EXPORT = '../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json';
const RULEBOOK_URL = '../rulebook/';
const EXPECTED_TARGET = "clean-v0.6.3-canonical-structured-authority";

const FACTION_LABELS = {
  neutral: "Neutral",
  military: "Military",
  diplomats: "Diplomats",
  financiers: "Financiers",
  intelligence: "Intelligence",
  mystics: "Mystics",
  inquisition: "Inquisition"
};

const state = {
  entries: [],
  query: "",
  type: "all",
  faction: "all",
  cost: "all",
  selectedId: null,
  version: "v0.6.3"
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();

  try {
    const response = await fetch(CANONICAL_DATA_SOURCE, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to load current card data: ${response.status}`);
    }

    const data = await response.json();
    const gameplay = validateCanonicalData(data);
    state.entries = [
      ...gameplay.cards.map(normalizeCard),
      ...gameplay.territories.map(normalizeTerritory)
    ].sort(sortEntries);
    applyHashSelection();

    const cardCount = state.entries.filter(entry => entry.type === "card").length;
    const territoryCount = state.entries.filter(entry => entry.type === "territory").length;
    el.cardTotal.textContent = cardCount;
    el.territoryTotal.textContent = territoryCount;
    el.dataStatus.textContent = `${state.version} · ${cardCount} playable cards + ${territoryCount} Territories loaded`;
    el.app.hidden = false;
    render();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = "Card Reference data unavailable";
    document.body.insertAdjacentHTML(
      "beforeend",
      `<p class="noscript">Unable to load the current v0.6.3 card data. Serve the repository through a web server rather than opening this file directly. <a href="${PUBLIC_DATA_EXPORT}">Open the v0.6.3 data export</a>.</p>`
    );
  }
}

function validateCanonicalData(data) {
  if (!data || typeof data !== "object") throw new Error("Canonical data is not an object.");
  if (data.target !== EXPECTED_TARGET) {
    throw new Error(`Expected ${EXPECTED_TARGET}, received ${data.target || "unknown target"}.`);
  }
  if (data.publication_unlocked !== false) throw new Error("Canonical reconstruction input unexpectedly reports publication unlocked.");

  const gameplay = data.gameplay;
  if (!gameplay || typeof gameplay !== "object") throw new Error("Canonical data has no gameplay payload.");
  if (!Array.isArray(gameplay.cards) || gameplay.cards.length !== 128) {
    throw new Error(`Expected 128 playable cards, received ${gameplay.cards?.length ?? "none"}.`);
  }
  if (!Array.isArray(gameplay.territories) || gameplay.territories.length !== 25) {
    throw new Error(`Expected 25 Territories, received ${gameplay.territories?.length ?? "none"}.`);
  }
  if (!Array.isArray(gameplay.factions) || gameplay.factions.length !== 6) {
    throw new Error(`Expected 6 factions, received ${gameplay.factions?.length ?? "none"}.`);
  }

  const secondLine = gameplay.cards.find(card => card.id === "neutral-reserves");
  if (secondLine?.name !== "Second Line") throw new Error("Stable card identity neutral-reserves is not Second Line.");
  const smugglersRun = gameplay.territories.find(territory => territory.id === "territory-smuggler-s-pass");
  if (smugglersRun?.name !== "Smuggler's Run") throw new Error("Stable Territory identity territory-smuggler-s-pass is not Smuggler's Run.");

  return gameplay;
}

function normalizeCard(card) {
  const faction = slugify(card.allegiance || "Neutral");
  return {
    id: card.id || `${faction}-${slugify(card.name)}`,
    type: "card",
    name: card.name,
    faction,
    factionLabel: card.allegiance || FACTION_LABELS[faction] || faction,
    cost: Number(card.cost),
    trait: card.trait || "",
    form: card.card_form || "",
    unique: Boolean(card.unique),
    uniqueRule: card.unique_rule || "",
    sections: normalizeEffects(card.effects),
    rulesNotes: normalizeNotes(card.rules_notes),
    source: CANONICAL_DATA_SOURCE
  };
}

function normalizeTerritory(territory) {
  const arena = Boolean(territory.arena) || String(territory.type).toLowerCase() === "arena";
  return {
    id: territory.id || `territory-${slugify(territory.name)}`,
    type: "territory",
    name: territory.name,
    faction: "territory",
    factionLabel: arena ? "Arena" : "Territory",
    arena,
    sections: normalizeEffects(territory.effects, "Effect"),
    rulesNotes: normalizeNotes(territory.rules_notes),
    source: CANONICAL_DATA_SOURCE
  };
}

function normalizeEffects(effects, unlabeledName = "Text") {
  const sections = {};
  for (const effect of Array.isArray(effects) ? effects : []) {
    const rawLabel = String(effect?.label || unlabeledName).trim();
    const label = rawLabel === "Text" ? unlabeledName : rawLabel;
    const text = String(effect?.text || "").trim();
    if (!text) continue;
    sections[label] = sections[label] ? `${sections[label]}\n${text}` : text;
  }
  return sections;
}

function normalizeNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.map(note => String(note || "").trim()).filter(Boolean);
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
      entry.uniqueRule || "",
      ...Object.keys(entry.sections),
      ...Object.values(entry.sections),
      ...(entry.rulesNotes || [])
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
  if (state.faction !== "all") parts.push(FACTION_LABELS[state.faction] || state.faction);
  if (state.cost !== "all") parts.push(`cost ${state.cost}`);
  return parts.length ? parts.join(" · ") : `All ${state.version} playable cards and Territories.`;
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
    el.preview.textContent = "Select a result to view its rules text.";
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
    </div>
    ${Object.entries(entry.sections).map(([label, text]) => `
      <section class="card-text-section">
        <div class="card-text-label">${escapeHtml(label)}</div>
        <p>${formatMultilineText(text)}</p>
      </section>
    `).join("")}
    ${entry.rulesNotes?.length ? `
      <section class="card-text-section">
        <div class="card-text-label">Rules notes</div>
        ${entry.rulesNotes.map(note => `<p>${formatMultilineText(note)}</p>`).join("")}
      </section>
    ` : ""}
    <div class="preview-actions">
      <button id="copyLink" class="button secondary" type="button">Copy direct link</button>
      <a class="button secondary" href="${RULEBOOK_URL}">Open Browser Rulebook</a>
      <a class="button secondary" href="../deckbuilder/">Open Deckbuilder</a>
    </div>
    <p class="preview-source">Current ${escapeHtml(state.version)} card and Territory text.</p>
  `;

  document.getElementById("copyLink")?.addEventListener("click", copyDirectLink);
}

function formatMultilineText(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
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
  return String(value || "").toLowerCase()
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
