const DATA_SOURCES = [
  {
    id: "v0.5.6",
    label: "v0.5.6 Asset Bank Patch",
    path: "../releases/v0.5.6/Gauntlet_v0.5.6_Canonical_Data.json"
  }
];

const STORAGE_KEY = "gauntlet.v05.deckbuilder.savedDecks";

const state = {
  source: DATA_SOURCES[0],
  data: null,
  deckName: "",
  cards: {},
  territories: [],
  search: "",
  costFilter: "all",
  sort: "name"
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindElements();
  bindEvents();
  renderVersionSelect();
  await loadData(state.source);
}

function bindElements() {
  for (const id of [
    "dataStatus",
    "versionSummary",
    "deckName",
    "versionSelect",
    "newDeckButton",
    "saveDeckButton",
    "copyDeckButton",
    "downloadJsonButton",
    "printDeckButton",
    "cardCount",
    "minimumCards",
    "pointTotal",
    "maximumPoints",
    "territoryCount",
    "territoryRequirement",
    "validityCard",
    "validityText",
    "availableCount",
    "cardSearch",
    "costFilter",
    "sortSelect",
    "availableCards",
    "deckCards",
    "clearMainDeckButton",
    "territoryList",
    "clearTerritoriesButton",
    "validationList",
    "savedDeckSelect",
    "loadDeckButton",
    "deleteDeckButton",
    "importJson",
    "importJsonButton"
  ]) {
    el[id] = document.getElementById(id);
  }
  el.appShell = document.querySelector(".app-shell");
  el.cardTemplate = document.getElementById("cardTemplate");
}

function bindEvents() {
  el.versionSelect.addEventListener("change", async () => {
    const source = DATA_SOURCES.find(item => item.id === el.versionSelect.value);
    if (!source) return;
    if (hasDeckContent() && !window.confirm("Changing versions will clear the current deck. Continue?")) {
      el.versionSelect.value = state.source.id;
      return;
    }
    state.source = source;
    clearDeckState();
    await loadData(source);
  });

  el.deckName.addEventListener("input", () => {
    state.deckName = el.deckName.value.trim();
  });

  el.cardSearch.addEventListener("input", () => {
    state.search = el.cardSearch.value.trim().toLowerCase();
    renderAvailableCards();
  });

  el.costFilter.addEventListener("change", () => {
    state.costFilter = el.costFilter.value;
    renderAvailableCards();
  });

  el.sortSelect.addEventListener("change", () => {
    state.sort = el.sortSelect.value;
    renderAvailableCards();
  });

  el.newDeckButton.addEventListener("click", () => {
    if (!hasDeckContent() || window.confirm("Clear the current deck and start a new one?")) {
      clearDeckState();
      renderAll();
    }
  });

  el.saveDeckButton.addEventListener("click", saveCurrentDeck);
  el.copyDeckButton.addEventListener("click", copyDeckList);
  el.downloadJsonButton.addEventListener("click", downloadDeckJson);
  el.printDeckButton.addEventListener("click", printDeck);
  el.clearMainDeckButton.addEventListener("click", () => {
    state.cards = {};
    renderAll();
  });
  el.clearTerritoriesButton.addEventListener("click", () => {
    state.territories = [];
    renderAll();
  });
  el.loadDeckButton.addEventListener("click", loadSelectedDeck);
  el.deleteDeckButton.addEventListener("click", deleteSelectedDeck);
  el.importJsonButton.addEventListener("click", importDeckJson);
}

function renderVersionSelect() {
  el.versionSelect.innerHTML = "";
  for (const source of DATA_SOURCES) {
    const option = document.createElement("option");
    option.value = source.id;
    option.textContent = source.label;
    el.versionSelect.append(option);
  }
  el.versionSelect.value = state.source.id;
}

async function loadData(source) {
  el.dataStatus.textContent = "Loading...";
  try {
    const response = await fetch(source.path, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Could not load ${source.path}`);
    }
    const data = await response.json();
    state.data = normalizeData(data);
    el.dataStatus.textContent = state.data.version;
    el.appShell.hidden = false;
    renderAll();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = "Load failed";
    el.appShell.hidden = false;
    el.versionSummary.textContent = "Could not load the canonical v0.5 data file. Open this through a local web server or GitHub Pages so the browser can fetch the JSON data.";
  }
}

function normalizeData(data) {
  const cards = [...(data.cards || [])]
    .filter(card => card.name && Number.isFinite(Number(card.cost)))
    .map(card => ({ ...card, cost: Number(card.cost) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const territories = [...(data.territories || [])]
    .filter(territory => territory.name)
    .map(territory => ({
      ...territory,
      arena: territory.name.toLowerCase().startsWith("arena:")
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...data,
    cards,
    territories,
    cardByName: Object.fromEntries(cards.map(card => [card.name, card])),
    territoryByName: Object.fromEntries(territories.map(territory => [territory.name, territory]))
  };
}

function renderAll() {
  if (!state.data) return;
  el.deckName.value = state.deckName;
  renderVersionSummary();
  renderCostFilter();
  renderAvailableCards();
  renderDeckCards();
  renderTerritories();
  renderValidation();
  renderSavedDecks();
}

function renderVersionSummary() {
  const rules = getRules();
  el.versionSummary.textContent = `${state.data.version} — ${state.data.status || "pre-faction playtest"}. Minimum ${rules.minimum_cards} main-deck cards, maximum ${rules.maximum_points} points, exactly ${rules.territories} Territories, maximum ${rules.maximum_arenas} Arena.`;
  el.minimumCards.textContent = rules.minimum_cards;
  el.maximumPoints.textContent = rules.maximum_points;
  el.territoryRequirement.textContent = rules.territories;
}

function renderCostFilter() {
  const costs = [...new Set(state.data.cards.map(card => card.cost))].sort((a, b) => a - b);
  const current = el.costFilter.value || "all";
  el.costFilter.innerHTML = '<option value="all">All costs</option>';
  for (const cost of costs) {
    const option = document.createElement("option");
    option.value = String(cost);
    option.textContent = `${cost} point${cost === 1 ? "" : "s"}`;
    el.costFilter.append(option);
  }
  el.costFilter.value = costs.includes(Number(current)) ? current : "all";
  state.costFilter = el.costFilter.value;
}

function renderAvailableCards() {
  const cards = getFilteredCards();
  el.availableCards.innerHTML = "";
  el.availableCount.textContent = `${cards.length} cards`;

  if (!cards.length) {
    el.availableCards.className = "card-list empty-state";
    el.availableCards.textContent = "No cards match the current filters.";
    return;
  }

  el.availableCards.className = "card-list";
  for (const card of cards) {
    const row = el.cardTemplate.content.firstElementChild.cloneNode(true);
    row.querySelector("h3").textContent = card.name;
    row.querySelector(".cost-pill").textContent = `${card.cost} pt`;
    row.querySelector(".action-text").innerHTML = card.action ? `<strong>Action:</strong> ${escapeHtml(card.action)}` : "";
    row.querySelector(".battle-text").innerHTML = card.battle ? `<strong>Battle:</strong> ${escapeHtml(card.battle)}` : "";
    const reminder = row.querySelector(".reminder-text");
    if (card.reminder) {
      reminder.innerHTML = `<strong>Note:</strong> ${escapeHtml(card.reminder)}`;
    } else {
      reminder.remove();
    }
    const owned = state.cards[card.name] || 0;
    const button = row.querySelector(".add-card-button");
    button.textContent = owned ? `Add (${owned})` : "Add";
    button.addEventListener("click", () => addCard(card.name));
    el.availableCards.append(row);
  }
}

function getFilteredCards() {
  let cards = [...state.data.cards];

  if (state.search) {
    cards = cards.filter(card => {
      const haystack = [card.name, card.action, card.battle, card.reminder].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(state.search);
    });
  }

  if (state.costFilter !== "all") {
    cards = cards.filter(card => card.cost === Number(state.costFilter));
  }

  cards.sort((a, b) => {
    if (state.sort === "cost-asc") return a.cost - b.cost || a.name.localeCompare(b.name);
    if (state.sort === "cost-desc") return b.cost - a.cost || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });

  return cards;
}

function renderDeckCards() {
  const entries = getDeckCardEntries();
  el.deckCards.innerHTML = "";

  if (!entries.length) {
    el.deckCards.className = "deck-list empty-state";
    el.deckCards.textContent = "No main-deck cards yet.";
    return;
  }

  el.deckCards.className = "deck-list";
  for (const { card, qty } of entries) {
    const row = document.createElement("article");
    row.className = "deck-row";

    const text = document.createElement("div");
    text.className = "deck-main";
    text.innerHTML = `
      <div class="deck-title-line">
        <h3>${escapeHtml(card.name)}</h3>
        <span class="qty-pill">${qty}x · ${qty * card.cost} pts</span>
      </div>
      <p class="card-text"><strong>Action:</strong> ${escapeHtml(card.action || "—")}</p>
      <p class="card-text"><strong>Battle:</strong> ${escapeHtml(card.battle || "—")}</p>
      ${card.reminder ? `<p class="card-text reminder-text"><strong>Note:</strong> ${escapeHtml(card.reminder)}</p>` : ""}
    `;

    const actions = document.createElement("div");
    actions.className = "deck-actions";

    const minus = makeIconButton("−", `Remove one ${card.name}`, () => removeCard(card.name));
    const plus = makeIconButton("+", `Add one ${card.name}`, () => addCard(card.name));
    const remove = makeIconButton("×", `Remove all ${card.name}`, () => removeAllCard(card.name));
    remove.classList.add("danger", "secondary");

    actions.append(minus, plus, remove);
    row.append(text, actions);
    el.deckCards.append(row);
  }
}

function renderTerritories() {
  const rules = getRules();
  const arenaCount = getSelectedArenaCount();
  el.territoryList.innerHTML = "";

  for (const territory of state.data.territories) {
    const selected = state.territories.includes(territory.name);
    const wouldExceedTerritoryLimit = !selected && state.territories.length >= rules.territories;
    const wouldExceedArenaLimit = !selected && territory.arena && arenaCount >= rules.maximum_arenas;

    const label = document.createElement("label");
    label.className = `territory-row ${selected ? "selected" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.disabled = wouldExceedTerritoryLimit || wouldExceedArenaLimit;
    checkbox.addEventListener("change", () => toggleTerritory(territory.name));

    const title = document.createElement("div");
    title.className = "territory-title-line";
    title.innerHTML = `
      <strong>${escapeHtml(territory.name)}</strong>
      ${territory.arena ? '<span class="arena-pill">Arena</span>' : ""}
    `;

    const text = document.createElement("p");
    text.className = "card-text";
    text.textContent = territory.text || "";

    label.append(checkbox, title, text);
    el.territoryList.append(label);
  }
}

function renderValidation() {
  const result = validateDeck();
  el.cardCount.textContent = result.cardCount;
  el.pointTotal.textContent = result.pointTotal;
  el.territoryCount.textContent = state.territories.length;

  el.validityCard.classList.toggle("valid", result.valid);
  el.validityCard.classList.toggle("invalid", !result.valid);
  el.validityText.textContent = result.valid ? "Valid" : "Invalid";

  el.validationList.innerHTML = "";
  if (result.valid) {
    const li = document.createElement("li");
    li.className = "valid-message";
    li.textContent = "This deck is valid under the loaded v0.5 rules.";
    el.validationList.append(li);
  }

  for (const message of result.errors) {
    const li = document.createElement("li");
    li.className = "error-message";
    li.textContent = message;
    el.validationList.append(li);
  }

  for (const message of result.warnings) {
    const li = document.createElement("li");
    li.className = "warning-message";
    li.textContent = message;
    el.validationList.append(li);
  }
}

function renderSavedDecks() {
  const decks = getSavedDecks().filter(deck => deck.gameVersion === state.data.version);
  const current = el.savedDeckSelect.value;
  el.savedDeckSelect.innerHTML = "";

  if (!decks.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No saved decks for this version";
    el.savedDeckSelect.append(option);
    el.loadDeckButton.disabled = true;
    el.deleteDeckButton.disabled = true;
    return;
  }

  for (const deck of decks) {
    const option = document.createElement("option");
    option.value = deck.id;
    option.textContent = deck.name;
    el.savedDeckSelect.append(option);
  }

  if (decks.some(deck => deck.id === current)) {
    el.savedDeckSelect.value = current;
  }

  el.loadDeckButton.disabled = false;
  el.deleteDeckButton.disabled = false;
}

function validateDeck() {
  const rules = getRules();
  const errors = [];
  const warnings = [];
  const entries = getDeckCardEntries();
  const cardCount = entries.reduce((total, item) => total + item.qty, 0);
  const pointTotal = entries.reduce((total, item) => total + item.qty * item.card.cost, 0);
  const selectedTerritories = state.territories.map(name => state.data.territoryByName[name]).filter(Boolean);
  const arenaCount = selectedTerritories.filter(territory => territory.arena).length;

  if (cardCount < rules.minimum_cards) {
    errors.push(`Add ${rules.minimum_cards - cardCount} more main-deck card${rules.minimum_cards - cardCount === 1 ? "" : "s"}.`);
  }

  if (pointTotal > rules.maximum_points) {
    errors.push(`Remove ${pointTotal - rules.maximum_points} point${pointTotal - rules.maximum_points === 1 ? "" : "s"} from the main deck.`);
  }

  if (state.territories.length !== rules.territories) {
    errors.push(`Choose exactly ${rules.territories} different Territories.`);
  }

  if (new Set(state.territories).size !== state.territories.length) {
    errors.push("Territories must be different.");
  }

  if (arenaCount > rules.maximum_arenas) {
    errors.push(`Choose no more than ${rules.maximum_arenas} Arena Territory.`);
  }

  for (const uniqueName of rules.unique_cards || []) {
    if ((state.cards[uniqueName] || 0) > 1) {
      errors.push(`${uniqueName} is unique. Use no more than one copy.`);
    }
  }

  const missingCards = Object.keys(state.cards).filter(name => !state.data.cardByName[name]);
  if (missingCards.length) {
    errors.push(`Unknown card${missingCards.length === 1 ? "" : "s"}: ${missingCards.join(", ")}.`);
  }

  const missingTerritories = state.territories.filter(name => !state.data.territoryByName[name]);
  if (missingTerritories.length) {
    errors.push(`Unknown Territor${missingTerritories.length === 1 ? "y" : "ies"}: ${missingTerritories.join(", ")}.`);
  }

  if (cardCount > rules.minimum_cards && pointTotal < rules.maximum_points) {
    warnings.push("Deck is legal below the point cap, but may be intentionally leaving points unused.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    cardCount,
    pointTotal,
    arenaCount
  };
}

function getRules() {
  return state.data?.deck_construction || {
    minimum_cards: 30,
    maximum_points: 60,
    territories: 3,
    maximum_arenas: 1,
    unique_cards: []
  };
}

function getDeckCardEntries() {
  return Object.entries(state.cards)
    .filter(([, qty]) => qty > 0)
    .map(([name, qty]) => ({ card: state.data.cardByName[name], qty }))
    .filter(item => item.card)
    .sort((a, b) => a.card.name.localeCompare(b.card.name));
}

function addCard(name) {
  state.cards[name] = (state.cards[name] || 0) + 1;
  renderAll();
}

function removeCard(name) {
  if (!state.cards[name]) return;
  state.cards[name] -= 1;
  if (state.cards[name] <= 0) delete state.cards[name];
  renderAll();
}

function removeAllCard(name) {
  delete state.cards[name];
  renderAll();
}

function toggleTerritory(name) {
  const selected = state.territories.includes(name);
  if (selected) {
    state.territories = state.territories.filter(item => item !== name);
  } else {
    const rules = getRules();
    const territory = state.data.territoryByName[name];
    if (state.territories.length >= rules.territories) return;
    if (territory?.arena && getSelectedArenaCount() >= rules.maximum_arenas) return;
    state.territories = [...state.territories, name];
  }
  renderAll();
}

function getSelectedArenaCount() {
  return state.territories
    .map(name => state.data.territoryByName[name])
    .filter(territory => territory?.arena).length;
}

function hasDeckContent() {
  return Boolean(state.deckName || Object.keys(state.cards).length || state.territories.length);
}

function clearDeckState() {
  state.deckName = "";
  state.cards = {};
  state.territories = [];
  el.importJson.value = "";
}

function buildDeckObject() {
  return {
    id: cryptoRandomId(),
    name: state.deckName || "Untitled deck",
    gameVersion: state.data.version,
    ruleset: "v0.5-pre-faction",
    savedAt: new Date().toISOString(),
    cards: getDeckCardEntries().map(({ card, qty }) => ({ cardName: card.name, qty })),
    territories: [...state.territories]
  };
}

function saveCurrentDeck() {
  if (!state.data) return;
  const name = state.deckName || window.prompt("Deck name", "Untitled deck");
  if (!name) return;
  state.deckName = name.trim();
  el.deckName.value = state.deckName;

  const decks = getSavedDecks();
  const existing = decks.find(deck => deck.name === state.deckName && deck.gameVersion === state.data.version);
  const deck = buildDeckObject();

  if (existing) {
    deck.id = existing.id;
  }

  const nextDecks = decks.filter(item => item.id !== deck.id);
  nextDecks.push(deck);
  setSavedDecks(nextDecks);
  renderSavedDecks();
  el.savedDeckSelect.value = deck.id;
  flashStatus("Saved");
}

function loadSelectedDeck() {
  const deck = getSavedDecks().find(item => item.id === el.savedDeckSelect.value);
  if (!deck) return;
  applyDeckObject(deck);
}

function deleteSelectedDeck() {
  const deckId = el.savedDeckSelect.value;
  if (!deckId) return;
  const deck = getSavedDecks().find(item => item.id === deckId);
  if (!deck || !window.confirm(`Delete saved deck "${deck.name}"?`)) return;
  setSavedDecks(getSavedDecks().filter(item => item.id !== deckId));
  renderSavedDecks();
}

function applyDeckObject(deck) {
  if (deck.gameVersion !== state.data.version) {
    window.alert(`This deck was built for ${deck.gameVersion}. Switch to that version before loading it.`);
    return;
  }

  state.deckName = deck.name || "Untitled deck";
  state.cards = {};
  for (const item of deck.cards || []) {
    const name = item.cardName || item.cardId || item.name;
    const qty = Number(item.qty || 1);
    if (name && qty > 0) {
      state.cards[name] = (state.cards[name] || 0) + qty;
    }
  }
  state.territories = [...(deck.territories || [])];
  renderAll();
}

function getSavedDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setSavedDecks(decks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(decks));
}

async function copyDeckList() {
  const text = buildDeckText();
  try {
    await navigator.clipboard.writeText(text);
    flashStatus("Copied");
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.append(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
    flashStatus("Copied");
  }
}

function downloadDeckJson() {
  const deck = buildDeckObject();
  const blob = new Blob([JSON.stringify(deck, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(deck.name)}-${deck.gameVersion}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function importDeckJson() {
  const raw = el.importJson.value.trim();
  if (!raw) return;
  try {
    const deck = JSON.parse(raw);
    applyDeckObject(deck);
    el.importJson.value = "";
  } catch (error) {
    console.error(error);
    window.alert("Could not parse that deck JSON.");
  }
}

function buildDeckText() {
  const result = validateDeck();
  const entries = getDeckCardEntries();
  const lines = [];
  lines.push(`${state.deckName || "Untitled deck"}`);
  lines.push(`Gauntlet ${state.data.version} deck`);
  lines.push(`Status: ${result.valid ? "Valid" : "Invalid"}`);
  lines.push(`Main deck: ${result.cardCount} cards`);
  lines.push(`Points: ${result.pointTotal}/${getRules().maximum_points}`);
  lines.push("");
  lines.push("Main deck");
  for (const { card, qty } of entries) {
    lines.push(`${qty}x ${card.name} (${card.cost})`);
  }
  lines.push("");
  lines.push("Territories");
  for (const territory of state.territories) {
    lines.push(`- ${territory}`);
  }
  if (!result.valid) {
    lines.push("");
    lines.push("Validation issues");
    for (const error of result.errors) {
      lines.push(`- ${error}`);
    }
  }
  return lines.join("\n");
}

function printDeck() {
  const result = validateDeck();
  if (!result.valid && !window.confirm("This deck is currently invalid. Print anyway?")) return;

  const deckTitle = state.deckName || "Untitled deck";
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.alert("Popup blocked. Allow popups to use print/PDF export.");
    return;
  }

  const repeatedCards = [];
  for (const { card, qty } of getDeckCardEntries()) {
    for (let index = 0; index < qty; index += 1) repeatedCards.push(card);
  }

  const territoryCards = state.territories
    .map(name => state.data.territoryByName[name])
    .filter(Boolean);

  printWindow.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(deckTitle)} — ${escapeHtml(state.data.version)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Georgia, "Times New Roman", serif; color: #1f1a14; margin: 0; padding: 0.25in; }
    h1 { font-size: 22pt; margin: 0 0 0.05in; }
    h2 { font-size: 13pt; margin: 0.18in 0 0.08in; break-after: avoid; }
    p { margin: 0 0 0.08in; }
    .summary { font-family: Arial, sans-serif; font-size: 10pt; margin-bottom: 0.15in; }
    .decklist { columns: 2; font-family: Arial, sans-serif; font-size: 9.5pt; margin-bottom: 0.2in; }
    .card-grid { display: grid; grid-template-columns: repeat(3, 2.5in); gap: 0.12in; align-items: start; }
    .print-card { width: 2.5in; height: 3.5in; border: 1px solid #1f1a14; border-radius: 0.12in; padding: 0.12in; display: flex; flex-direction: column; break-inside: avoid; page-break-inside: avoid; }
    .card-header { display: flex; justify-content: space-between; gap: 0.1in; border-bottom: 1px solid #1f1a14; padding-bottom: 0.05in; margin-bottom: 0.08in; }
    .card-name { font-weight: bold; font-size: 11pt; }
    .card-cost { font-family: Arial, sans-serif; font-weight: bold; }
    .label { font-family: Arial, sans-serif; font-weight: bold; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.04em; margin-top: 0.06in; }
    .text { font-size: 8.5pt; line-height: 1.22; }
    .territory .card-header { border-bottom-style: double; }
    .reminder { font-size: 7.5pt; font-style: italic; margin-top: auto; color: #554b40; }
    @page { size: letter; margin: 0.25in; }
  </style>
</head>
<body>
  <h1>${escapeHtml(deckTitle)}</h1>
  <p class="summary">${escapeHtml(state.data.version)} · ${result.cardCount} main-deck cards · ${result.pointTotal}/${getRules().maximum_points} points · ${state.territories.length}/${getRules().territories} Territories · ${result.valid ? "Valid" : "Invalid"}</p>
  <h2>Deck list</h2>
  <div class="decklist">${getDeckCardEntries().map(({ card, qty }) => `${qty}x ${escapeHtml(card.name)} (${card.cost})`).join("<br>")}<br><br><strong>Territories</strong><br>${state.territories.map(escapeHtml).join("<br>")}</div>
  <h2>Main deck cards</h2>
  <div class="card-grid">
    ${repeatedCards.map(cardToPrintHtml).join("")}
  </div>
  <h2>Territories</h2>
  <div class="card-grid">
    ${territoryCards.map(territoryToPrintHtml).join("")}
  </div>
</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
}

function cardToPrintHtml(card) {
  return `<article class="print-card">
    <div class="card-header"><span class="card-name">${escapeHtml(card.name)}</span><span class="card-cost">${card.cost}</span></div>
    <div class="label">Action</div>
    <div class="text">${escapeHtml(card.action || "—")}</div>
    <div class="label">Battle</div>
    <div class="text">${escapeHtml(card.battle || "—")}</div>
    ${card.reminder ? `<div class="reminder">${escapeHtml(card.reminder)}</div>` : ""}
  </article>`;
}

function territoryToPrintHtml(territory) {
  return `<article class="print-card territory">
    <div class="card-header"><span class="card-name">${escapeHtml(territory.name)}</span><span class="card-cost">Territory</span></div>
    <div class="text">${escapeHtml(territory.text || "")}</div>
  </article>`;
}

function makeIconButton(text, label, handler) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "icon-button secondary";
  button.textContent = text;
  button.setAttribute("aria-label", label);
  button.addEventListener("click", handler);
  return button;
}

function flashStatus(message) {
  const original = el.dataStatus.textContent;
  el.dataStatus.textContent = message;
  setTimeout(() => {
    el.dataStatus.textContent = state.data?.version || original;
  }, 1100);
}

function cryptoRandomId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `deck-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "gauntlet-deck";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
