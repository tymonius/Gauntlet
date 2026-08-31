const SOURCES = {};
const FACTIONS = [];

const state = {
  cards: [],
  deckName: "Untitled Gauntlet Deck",
  deckStorageKey: "gauntlet-current-game-decks",
  factionId: "military",
  leaderId: "general",
  deck: {},
  search: "",
  cost: "all",
  allegiance: "all",
  selectedCardId: null
};

const el = {};

const extensionHooks = {
  render: [],
  validate: [],
  serialize: [],
  hydrate: [],
  factionChange: [],
};

let authorityBootstrap = null;
let sourceLoader = null;
let selectedRuleset = null;
const featureApis = new Map();

function requireHook(kind, callback) {
  if (typeof callback !== "function") throw new TypeError(`Deckbuilder ${kind} hook must be a function.`);
  extensionHooks[kind].push(callback);
  return () => {
    const index = extensionHooks[kind].indexOf(callback);
    if (index >= 0) extensionHooks[kind].splice(index, 1);
  };
}

const deckbuilderApi = Object.freeze({
  state,
  sources: SOURCES,
  factions: FACTIONS,
  registerRenderHook: callback => requireHook("render", callback),
  registerValidationHook: callback => requireHook("validate", callback),
  registerSerializeHook: callback => requireHook("serialize", callback),
  registerHydrateHook: callback => requireHook("hydrate", callback),
  registerFactionChangeHook: callback => requireHook("factionChange", callback),
  registerFeature(name, api) {
    const key = String(name || "").trim();
    if (!key) throw new TypeError("Deckbuilder feature name is required.");
    if (!api || typeof api !== "object") throw new TypeError(`Deckbuilder feature ${key} must be an object.`);
    if (featureApis.has(key)) throw new Error(`Deckbuilder feature ${key} is already registered.`);
    featureApis.set(key, Object.freeze(api));
    return featureApis.get(key);
  },
  feature(name) {
    return featureApis.get(String(name || "").trim()) || null;
  },
  setAuthorityBootstrap(callback) {
    if (authorityBootstrap && authorityBootstrap !== callback) throw new Error("Deckbuilder authority bootstrap is already configured.");
    if (typeof callback !== "function") throw new TypeError("Deckbuilder authority bootstrap must be a function.");
    authorityBootstrap = callback;
  },
  bootstrap() {
    if (typeof authorityBootstrap !== "function") throw new Error("Current Deckbuilder runtime is unavailable.");
    return authorityBootstrap();
  },
  setSourceLoader(callback) {
    if (sourceLoader && sourceLoader !== callback) throw new Error("Deckbuilder source loader is already configured.");
    if (typeof callback !== "function") throw new TypeError("Deckbuilder source loader must be a function.");
    sourceLoader = callback;
  },
  loadSource(entry) {
    if (typeof sourceLoader !== "function") throw new Error("Current Deckbuilder card loader is unavailable.");
    return sourceLoader(entry);
  },
  setRuleset(ruleset) {
    selectedRuleset = Object.freeze({ ...ruleset });
    return selectedRuleset;
  },
  ruleset() {
    return selectedRuleset;
  },
  render: () => renderAll(),
  renderFactionOptions: () => renderFactionOptions(),
  validate: () => validateDeck(),
  serialize: () => currentDeckData(),
  hydrate: data => applyDeckData(data),
  getFaction: () => getFaction(),
  getCard: id => getCard(id),
  deckEntries: () => deckEntries(),
  escapeHtml: value => escapeHtml(value),
});

window.GAUNTLET_DECKBUILDER = deckbuilderApi;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();

  try {
    await deckbuilderApi.bootstrap();
    renderFactionOptions();
    const pools = await Promise.all(Object.entries(SOURCES).map(loadSource));
    state.cards = pools.flat().sort((a, b) => a.name.localeCompare(b.name));
    el.dataStatus.textContent = `${state.cards.length} active cards loaded`;
    el.app.hidden = false;
    renderAll();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = "Source load failed";
    document.body.insertAdjacentHTML("beforeend", `<p class="warning-panel panel">Unable to load the selected Gauntlet ruleset. Reload the page or switch rulesets.</p>`);
  }
}

function cacheElements() {
  for (const id of [
    "app", "dataStatus", "deckName", "factionSelect", "leaderSelect", "leaderPreview",
    "cardCount", "pointTotal", "factionCardCount", "validityCard", "validityText",
    "validationList", "savedDeckSelect", "saveDeckButton", "loadDeckButton", "deleteDeckButton",
    "copyDeckButton", "exportJsonButton", "importJson", "importJsonButton", "cardSearch",
    "allegianceFilter", "costFilter", "availableCount", "availableCards", "cardPreview",
    "clearDeckButton", "deckCards"
  ]) el[id] = document.getElementById(id);
}

function bindEvents() {
  el.deckName.addEventListener("input", () => { state.deckName = el.deckName.value; });
  el.factionSelect.addEventListener("change", changeFaction);
  el.leaderSelect.addEventListener("change", () => { state.leaderId = el.leaderSelect.value; renderLeader(); validateAndRender(); });
  el.cardSearch.addEventListener("input", () => { state.search = el.cardSearch.value.trim().toLowerCase(); renderAvailable(); });
  el.costFilter.addEventListener("change", () => { state.cost = el.costFilter.value; renderAvailable(); });
  el.allegianceFilter.addEventListener("change", () => { state.allegiance = el.allegianceFilter.value; renderAvailable(); });
  el.clearDeckButton.addEventListener("click", () => {
    if (Object.keys(state.deck).length && !confirm("Remove every card from this deck?")) return;
    state.deck = {};
    renderAll();
  });
  el.saveDeckButton.addEventListener("click", saveDeck);
  el.loadDeckButton.addEventListener("click", loadDeck);
  el.deleteDeckButton.addEventListener("click", deleteDeck);
  el.copyDeckButton.addEventListener("click", copyDeckList);
  el.exportJsonButton.addEventListener("click", exportDeckJson);
  el.importJsonButton.addEventListener("click", importDeckJson);
}

async function loadSource(entry) {
  return deckbuilderApi.loadSource(entry);
}

function renderAll() {
  el.deckName.value = state.deckName;
  el.factionSelect.value = state.factionId;
  renderLeaderOptions();
  renderLeader();
  renderAvailable();
  renderDeck();
  renderSavedDecks();
  validateAndRender();
  extensionHooks.render.forEach(hook => hook());
}

function renderFactionOptions() {
  el.factionSelect.innerHTML = FACTIONS.map(faction => {
    const suffix = faction.status === "ready" ? "" : " — in development";
    return `<option value="${faction.id}" ${faction.status !== "ready" ? "disabled" : ""}>${escapeHtml(faction.name + suffix)}</option>`;
  }).join("");
  el.factionSelect.value = state.factionId;
}

function renderLeaderOptions() {
  const faction = getFaction();
  if (!faction) {
    el.leaderSelect.innerHTML = "";
    return;
  }
  el.leaderSelect.innerHTML = faction.leaders.map(leader => `<option value="${leader.id}">${escapeHtml(leader.name)}</option>`).join("");
  if (!faction.leaders.some(leader => leader.id === state.leaderId)) state.leaderId = faction.leaders[0]?.id || "";
  el.leaderSelect.value = state.leaderId;
}

function renderLeader() {
  const faction = getFaction();
  const leader = faction?.leaders.find(item => item.id === state.leaderId);
  if (!faction || !leader || !leader.rules) {
    el.leaderPreview.className = "leader-preview empty-state";
    el.leaderPreview.textContent = faction ? "Leader package is still in development." : "Loading faction and Leader authority…";
    return;
  }

  el.leaderPreview.className = "leader-preview";
  el.leaderPreview.innerHTML = `
    <h3>${escapeHtml(leader.name)} <span class="mini-pill">${escapeHtml(faction.name)}</span></h3>
    <p class="leader-tagline">${escapeHtml(leader.tagline)}</p>
    <p><strong>${escapeHtml(leader.role)}</strong></p>
    <p>${escapeHtml(faction.identity)} <strong>Resource:</strong> ${escapeHtml(faction.resource)} <strong>Victory:</strong> ${escapeHtml(faction.victory)}</p>
    <div class="leader-rules">${leader.rules.map(([name, text]) => `<div class="leader-rule"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(text)}</div>`).join("")}</div>
  `;
}

function changeFaction() {
  const nextFaction = el.factionSelect.value;
  if (nextFaction === state.factionId) return;

  const removed = Object.keys(state.deck).filter(cardId => {
    const card = getCard(cardId);
    return card && card.faction !== "neutral" && card.faction !== nextFaction;
  });

  if (removed.length && !confirm(`Changing faction will remove ${removed.length} card title${removed.length === 1 ? "" : "s"} from the current faction. Continue?`)) {
    el.factionSelect.value = state.factionId;
    return;
  }

  removed.forEach(cardId => delete state.deck[cardId]);
  const previousFactionId = state.factionId;
  state.factionId = nextFaction;
  state.leaderId = getFaction()?.leaders[0]?.id || "";
  state.selectedCardId = null;
  extensionHooks.factionChange.forEach(hook => hook({ previousFactionId, factionId: state.factionId }));
  renderAll();
}

function availableCards() {
  if (!getFaction() || getFaction().status !== "ready") return [];
  return state.cards
    .filter(card => card.faction === "neutral" || card.faction === state.factionId)
    .filter(card => state.allegiance === "all" || (state.allegiance === "neutral" ? card.faction === "neutral" : card.faction === state.factionId))
    .filter(card => state.cost === "all" || card.cost === Number(state.cost))
    .filter(card => {
      if (!state.search) return true;
      return `${card.name} ${card.factionLabel} ${card.complexity} ${card.trait} ${Object.values(card.sections).join(" ")}`.toLowerCase().includes(state.search);
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function renderAvailable() {
  const cards = availableCards();
  el.availableCount.textContent = cards.length;
  el.availableCards.innerHTML = "";

  if (!cards.length) {
    el.availableCards.className = "compact-card-list empty-state";
    el.availableCards.textContent = "No cards match the current filters.";
    renderCardPreview(null);
    return;
  }

  el.availableCards.className = "compact-card-list";
  if (!cards.some(card => card.id === state.selectedCardId)) state.selectedCardId = cards[0].id;

  cards.forEach(card => {
    const row = document.createElement("article");
    row.className = `compact-card-row${card.id === state.selectedCardId ? " selected" : ""}`;
    const qty = state.deck[card.id] || 0;
    row.innerHTML = `
      <div>
        <div class="compact-card-title"><strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${card.cost}</span></div>
        <div class="compact-card-meta"><span class="mini-pill">${escapeHtml(card.factionLabel)}</span><span class="mini-pill">${escapeHtml(card.complexity)}</span>${qty ? `<span class="mini-pill">${qty} in deck</span>` : ""}</div>
      </div>
      <button type="button">Add</button>
    `;
    row.addEventListener("click", event => {
      if (event.target.tagName !== "BUTTON") {
        state.selectedCardId = card.id;
        renderAvailable();
        return;
      }
      addCard(card.id);
    });
    el.availableCards.append(row);
  });

  renderCardPreview(getCard(state.selectedCardId));
}

function renderCardPreview(card) {
  if (!card) {
    el.cardPreview.className = "card-preview empty-state";
    el.cardPreview.textContent = "Select a card to view its active working text.";
    return;
  }

  el.cardPreview.className = "card-preview";
  el.cardPreview.innerHTML = `
    <h3>${escapeHtml(card.name)}</h3>
    <div class="card-preview-meta">
      <span class="mini-pill">Cost ${card.cost}</span>
      <span class="mini-pill">${escapeHtml(card.factionLabel)}</span>
      <span class="mini-pill">${escapeHtml(card.complexity)}</span>
      ${card.form ? `<span class="mini-pill">${escapeHtml(card.form)}</span>` : ""}
      ${card.trait ? `<span class="mini-pill">${escapeHtml(card.trait)} trait</span>` : ""}
      ${card.unique ? `<span class="mini-pill">Unique</span>` : ""}
    </div>
    ${Object.entries(card.sections).map(([label, text]) => `<section class="card-text-section"><div class="card-text-label">${escapeHtml(label)}</div><p>${escapeHtml(text)}</p></section>`).join("")}
    <div class="button-row"><button id="previewAddButton" type="button">Add to deck</button></div>
  `;
  document.getElementById("previewAddButton").addEventListener("click", () => addCard(card.id));
}

function addCard(cardId) {
  const card = getCard(cardId);
  if (!card) return;
  if (card.unique && (state.deck[cardId] || 0) >= 1) return;
  state.deck[cardId] = (state.deck[cardId] || 0) + 1;
  renderAll();
}

function removeCard(cardId) {
  const qty = state.deck[cardId] || 0;
  if (qty <= 1) delete state.deck[cardId];
  else state.deck[cardId] = qty - 1;
  renderAll();
}

function removeAll(cardId) {
  delete state.deck[cardId];
  renderAll();
}

function deckEntries() {
  return Object.entries(state.deck)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ card: getCard(id), qty }))
    .filter(entry => entry.card)
    .sort((a, b) => a.card.name.localeCompare(b.card.name));
}

function renderDeck() {
  const entries = deckEntries();
  if (!entries.length) {
    el.deckCards.className = "deck-list empty-state";
    el.deckCards.textContent = "No cards added yet.";
    return;
  }

  el.deckCards.className = "deck-list";
  el.deckCards.innerHTML = "";
  entries.forEach(({ card, qty }) => {
    const row = document.createElement("article");
    row.className = "deck-row";
    row.innerHTML = `
      <div>
        <div class="deck-title"><strong>${escapeHtml(card.name)}</strong><span class="mini-pill">${escapeHtml(card.factionLabel)}</span></div>
        <div class="deck-stats"><span class="mini-pill">${qty}×</span><span class="mini-pill">${card.cost} each</span><span class="mini-pill">${qty * card.cost} value</span>${card.unique ? `<span class="mini-pill">Unique</span>` : ""}</div>
      </div>
      <div class="deck-actions">
        <button type="button" class="secondary" data-action="minus">−</button>
        <button type="button" data-action="plus">+</button>
        <button type="button" class="secondary danger" data-action="remove">×</button>
      </div>
    `;
    row.querySelector('[data-action="minus"]').addEventListener("click", () => removeCard(card.id));
    row.querySelector('[data-action="plus"]').addEventListener("click", () => addCard(card.id));
    row.querySelector('[data-action="remove"]').addEventListener("click", () => removeAll(card.id));
    el.deckCards.append(row);
  });
}

function validateDeck() {
  const entries = deckEntries();
  const cardCount = entries.reduce((sum, entry) => sum + entry.qty, 0);
  const pointTotal = entries.reduce((sum, entry) => sum + entry.qty * entry.card.cost, 0);
  const factionCardCount = entries.filter(entry => entry.card.faction === state.factionId).reduce((sum, entry) => sum + entry.qty, 0);
  const errors = [];
  const warnings = ["Territory selection is not yet included in this development build."];

  if (!state.factionId) errors.push("Choose a faction.");
  if (!state.leaderId) errors.push("Choose a leader.");
  if (cardCount < 30) errors.push(`Add at least ${30 - cardCount} more playable card${30 - cardCount === 1 ? "" : "s"}.`);
  if (pointTotal > 60) errors.push(`Remove ${pointTotal - 60} value.`);

  entries.forEach(({ card, qty }) => {
    if (card.unique && qty > 1) errors.push(`${card.name} is Unique: maximum one copy.`);
    if (card.faction !== "neutral" && card.faction !== state.factionId) errors.push(`${card.name} is not legal for ${getFaction().name}.`);
  });

  let result = { cardCount, pointTotal, factionCardCount, errors, warnings, valid: errors.length === 0 };
  for (const hook of extensionHooks.validate) {
    const next = hook(result);
    if (next) result = next;
  }
  return {
    ...result,
    errors: [...(result.errors || [])],
    warnings: [...(result.warnings || [])],
    valid: (result.errors || []).length === 0,
  };
}

function validateAndRender() {
  const result = validateDeck();
  el.cardCount.textContent = result.cardCount;
  el.pointTotal.textContent = result.pointTotal;
  el.factionCardCount.textContent = result.factionCardCount;
  el.validityText.textContent = result.valid ? "Card-valid" : "Incomplete";
  el.validityCard.classList.toggle("valid", result.valid);
  el.validityCard.classList.toggle("invalid", !result.valid);

  el.validationList.innerHTML = [
    ...(result.errors.length ? result.errors.map(message => `<li>${escapeHtml(message)}</li>`) : ["<li class=\"ok\">Playable-card count and value are valid.</li>"]),
    ...result.warnings.map(message => `<li class=\"warning\">${escapeHtml(message)}</li>`)
  ].join("");
}

function currentDeckData() {
  let data = {
    schema: "gauntlet-deck",
    schemaVersion: 3,
    gameVersion: state.currentGameVersion || "current-game",
    gameAuthority: state.currentGameAuthority || "/game-data/current-game.json",
    name: state.deckName.trim() || "Untitled Gauntlet Deck",
    factionId: state.factionId,
    leaderId: state.leaderId,
    cards: deckEntries().map(({ card, qty }) => ({ id: card.id, name: card.name, faction: card.faction, qty }))
  };
  for (const hook of extensionHooks.serialize) {
    const next = hook(data);
    if (next) data = next;
  }
  return data;
}

function saveDeck() {
  const data = currentDeckData();
  const saved = readSavedDecks();
  const key = data.name.toLowerCase();
  saved[key] = data;
  localStorage.setItem(deckStorageKey(), JSON.stringify(saved));
  renderSavedDecks();
  el.savedDeckSelect.value = key;
}

function loadDeck() {
  const key = el.savedDeckSelect.value;
  const data = readSavedDecks()[key];
  if (data) applyDeckData(data);
}

function deleteDeck() {
  const key = el.savedDeckSelect.value;
  if (!key) return;
  const saved = readSavedDecks();
  delete saved[key];
  localStorage.setItem(deckStorageKey(), JSON.stringify(saved));
  renderSavedDecks();
}

function renderSavedDecks() {
  const saved = readSavedDecks();
  const entries = Object.entries(saved).sort((a, b) => a[1].name.localeCompare(b[1].name));
  el.savedDeckSelect.innerHTML = entries.length
    ? entries.map(([key, deck]) => `<option value="${escapeHtml(key)}">${escapeHtml(deck.name)}</option>`).join("")
    : '<option value="">No saved decks</option>';
  el.loadDeckButton.disabled = !entries.length;
  el.deleteDeckButton.disabled = !entries.length;
}

function deckStorageKey() {
  return state.deckStorageKey || "gauntlet-current-game-decks";
}

function readSavedDecks() {
  try { return JSON.parse(localStorage.getItem(deckStorageKey()) || "{}"); }
  catch { return {}; }
}

function applyDeckData(data) {
  if (data.schema !== "gauntlet-deck" || data.schemaVersion !== 3) {
    throw new Error("This is not a current Gauntlet Deck export.");
  }
  const currentVersion = state.currentGameVersion || "current-game";
  if (data.gameVersion && data.gameVersion !== currentVersion) {
    throw new Error(`This Deck was exported for ${data.gameVersion}; current authority is ${currentVersion}.`);
  }
  const faction = FACTIONS.find(item => item.id === data.factionId && item.status === "ready");
  if (!faction) throw new Error("The exported faction is not currently available.");

  state.deckName = data.name || "";
  state.factionId = faction.id;
  state.leaderId = faction.leaders.some(leader => leader.id === data.leaderId) ? data.leaderId : faction.leaders[0].id;
  state.deck = {};

  for (const item of data.cards || []) {
    const card = getCard(item.id) || state.cards.find(candidate => candidate.name === item.name && candidate.faction === item.faction);
    if (!card || (card.faction !== "neutral" && card.faction !== state.factionId)) continue;
    state.deck[card.id] = Number(item.qty) || 0;
  }

  extensionHooks.hydrate.forEach(hook => hook(data));
  renderAll();
}

async function copyDeckList() {
  const data = currentDeckData();
  const faction = getFaction();
  const leader = faction.leaders.find(item => item.id === state.leaderId);
  const validation = validateDeck();
  const lines = [
    data.name,
    `${faction.name} — ${leader?.name || "No leader"}`,
    `${validation.cardCount} cards · ${validation.pointTotal}/60 value`,
    "",
    ...deckEntries().map(({ card, qty }) => `${qty}x ${card.name} (${card.cost}) [${card.factionLabel}]`),
    "",
    `Territories: ${(state.territories || []).map(id => state.territoryPool?.find(item => item.id === id)?.name || id).join(", ") || "None"}`,
    ...(state.factionId === "mystics"
      ? [`Rites: ${(state.rites || []).map(id => state.currentGameData?.mystics?.rites?.find(item => item.id === id)?.name || id).join(", ") || "None"}`]
      : [])
  ];
  await navigator.clipboard.writeText(lines.join("\n"));
}

function exportDeckJson() {
  const data = JSON.stringify(currentDeckData(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(currentDeckData().name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importDeckJson() {
  try {
    const data = JSON.parse(el.importJson.value);
    applyDeckData(data);
    el.importJson.value = "";
  } catch (error) {
    alert(error.message || "Unable to import that deck.");
  }
}

function getFaction() { return FACTIONS.find(faction => faction.id === state.factionId); }
function getCard(id) { return state.cards.find(card => card.id === id); }
function slugify(value) { return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]); }
