const V062_VERSION = "v0.6.2";

const STORAGE_KEY = "gauntlet-v062-deckbuilder";
const state = { data: null, starters: [], factionId: "military", leaderId: "general", deckName: "", cards: {}, territories: [], search: "", allegiance: "all", cost: "all" };
const $ = id => document.getElementById(id);

init().catch(error => {
  console.error(error);
  $("sourceStatus").innerHTML = `<strong class="status-bad">Published release load failed.</strong><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  const [data, starterData] = await Promise.all([
    fetch("../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" }).then(assertJson),
    fetch("../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Starter_Decks.json", { cache: "no-store" }).then(assertJson)
  ]);
  state.data = data;
  state.starters = starterData.decks ?? [];
  restore();
  applyQuerySelection();
  bind();
  renderFactionOptions();
  $("sourceStatus").innerHTML = `<strong class="status-good">${data.cards.length} cards loaded.</strong><p>${escapeHtml(V062_VERSION)} · ${data.territories.length} Territories · ${data.proposals.length} Proposals</p>`;
  $("app").classList.remove("hidden");
  if (new URLSearchParams(location.search).get("starter") === "1") loadStarter();
  else renderAll();
}

async function assertJson(response) {
  if (!response.ok) throw new Error(`Starter catalog returned ${response.status}`);
  return response.json();
}

function bind() {
  $("faction").addEventListener("change", () => {
    state.factionId = $("faction").value;
    state.leaderId = slug(selectedFaction().leaders[0].name);
    state.cards = {};
    state.territories = [];
    renderLeaderOptions();
    renderAll();
    save();
  });
  $("leader").addEventListener("change", () => { state.leaderId = $("leader").value; renderAll(); save(); });
  $("deckName").addEventListener("input", () => { state.deckName = $("deckName").value; renderSummary(); save(); });
  $("search").addEventListener("input", () => { state.search = $("search").value.toLowerCase().trim(); renderAvailableCards(); });
  $("allegiance").addEventListener("change", () => { state.allegiance = $("allegiance").value; renderAvailableCards(); });
  $("cost").addEventListener("change", () => { state.cost = $("cost").value; renderAvailableCards(); });
  $("loadStarter").addEventListener("click", loadStarter);
  $("clearDeck").addEventListener("click", () => {
    if (!confirm("Clear every selected card and Territory?")) return;
    state.cards = {};
    state.territories = [];
    renderAll();
    save();
  });
  $("printDeck").addEventListener("click", () => window.print());
  $("exportDeck").addEventListener("click", exportDeck);
  $("downloadCanonical").addEventListener("click", () => downloadJson(`Gauntlet_${V062_VERSION}_Canonical_Data.json`, state.data));
}

function renderFactionOptions() {
  $("faction").replaceChildren(...state.data.factions.map(faction => option(faction.id, faction.name, faction.id === state.factionId)));
  renderLeaderOptions();
}

function renderLeaderOptions() {
  const faction = selectedFaction();
  const ids = faction.leaders.map(leader => slug(leader.name));
  if (!ids.includes(state.leaderId)) state.leaderId = ids[0];
  $("leader").replaceChildren(...faction.leaders.map(leader => option(slug(leader.name), leader.name, slug(leader.name) === state.leaderId)));
  renderStarterPreview();
}

function renderAll() {
  $("deckName").value = state.deckName;
  $("search").value = state.search;
  $("allegiance").value = state.allegiance;
  $("cost").value = state.cost;
  renderStarterPreview();
  renderAvailableCards();
  renderTerritories();
  renderSummary();
}

function renderStarterPreview() {
  const deck = selectedStarter();
  $("loadStarter").disabled = !deck;
  $("starterPreview").innerHTML = deck
    ? `<p class="eyebrow">Approved v0.6.2 starter</p><h3>${escapeHtml(deck.name)}</h3><p>${escapeHtml(deck.summary)}</p><p><strong>Opening plan:</strong> ${escapeHtml(deck.openingPlan ?? "Establish the faction engine early.")}</p><p><strong>Signature cards:</strong> ${(deck.signatureCards ?? []).map(escapeHtml).join(", ")}</p><p><strong>Territories:</strong> ${deck.territories.map(escapeHtml).join(" → ")}</p>`
    : "No approved starter matches this faction and Leader.";
}

function legalCards() {
  const factionName = selectedFaction().name;
  return state.data.cards.filter(card => {
    if (card.allegiance !== "Neutral" && card.allegiance !== factionName) return false;
    if (state.allegiance === "neutral" && card.allegiance !== "Neutral") return false;
    if (state.allegiance === "faction" && card.allegiance !== factionName) return false;
    if (state.cost !== "all" && String(card.cost) !== state.cost) return false;
    const haystack = `${card.name} ${card.allegiance} ${(card.effects ?? []).map(effect => `${effect.label} ${effect.text}`).join(" ")}`.toLowerCase();
    return !state.search || haystack.includes(state.search);
  });
}

function renderAvailableCards() {
  const cards = legalCards();
  $("availableCount").textContent = `${cards.length} titles`;
  const host = $("availableCards");
  host.replaceChildren();
  for (const card of cards) {
    const quantity = state.cards[card.id] ?? 0;
    const row = document.createElement("article");
    row.className = "card-row";
    row.innerHTML = `<div><h3>${escapeHtml(card.name)} <span class="pill">${card.cost}</span></h3><p>${escapeHtml(card.allegiance)}${card.trait ? ` · ${escapeHtml(card.trait)}` : ""}${card.unique ? " · Unique" : ""}</p><p>${escapeHtml(card.effects?.map(effect => `${effect.label}: ${effect.text}`).join(" · ") ?? "")}</p></div><div class="counter"><button class="secondary minus" aria-label="Remove ${escapeHtml(card.name)}">−</button><strong>${quantity}</strong><button class="plus" aria-label="Add ${escapeHtml(card.name)}">+</button></div>`;
    row.querySelector(".minus").disabled = quantity === 0;
    row.querySelector(".minus").addEventListener("click", () => changeQuantity(card, -1));
    row.querySelector(".plus").disabled = card.unique && quantity >= 1;
    row.querySelector(".plus").addEventListener("click", () => changeQuantity(card, 1));
    host.append(row);
  }
}

function changeQuantity(card, delta) {
  const current = state.cards[card.id] ?? 0;
  const next = card.unique ? Math.max(0, Math.min(1, current + delta)) : Math.max(0, current + delta);
  if (next) state.cards[card.id] = next;
  else delete state.cards[card.id];
  renderAvailableCards();
  renderSummary();
  save();
}

function renderTerritories() {
  const host = $("territories");
  host.replaceChildren();
  for (const territory of state.data.territories) {
    const selectedIndex = state.territories.indexOf(territory.id);
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `<input type="checkbox" value="${territory.id}"><strong>${escapeHtml(territory.name)}${selectedIndex >= 0 ? ` · ${selectedIndex + 1}` : ""}</strong><span class="muted">${escapeHtml(territory.text)}</span>`;
    const input = label.querySelector("input");
    input.checked = selectedIndex >= 0;
    input.disabled = selectedIndex < 0 && state.territories.length >= 3;
    input.addEventListener("change", () => {
      if (input.checked) state.territories.push(territory.id);
      else state.territories = state.territories.filter(id => id !== territory.id);
      renderTerritories();
      renderSummary();
      save();
    });
    host.append(label);
  }
}

function renderSummary() {
  const selected = selectedCardEntries();
  const count = selected.reduce((sum, entry) => sum + entry.quantity, 0);
  const value = selected.reduce((sum, entry) => sum + entry.quantity * entry.card.cost, 0);
  const validation = validateDeck(selected, count, value);
  $("cardCount").textContent = count;
  $("valueTotal").textContent = value;
  $("territoryCount").textContent = state.territories.length;
  $("validity").textContent = validation.valid ? "Legal" : "Incomplete";
  $("validity").className = validation.valid ? "status-good" : "status-bad";
  $("validityDetail").textContent = validation.valid ? "Ready to print" : `${validation.messages.length} issue${validation.messages.length === 1 ? "" : "s"}`;
  $("printTitle").textContent = state.deckName.trim() || selectedStarter()?.name || "Untitled Deck";
  $("printIdentity").textContent = `${selectedLeader().name} · ${selectedFaction().name} · ${count} cards · ${value}/60 value`;

  const host = $("selectedCards");
  host.replaceChildren();
  const groups = new Map();
  for (const entry of selected) {
    const list = groups.get(entry.card.allegiance) ?? [];
    list.push(entry);
    groups.set(entry.card.allegiance, list);
  }
  for (const [allegiance, entries] of groups) {
    const heading = document.createElement("h3");
    heading.textContent = allegiance;
    host.append(heading);
    const list = document.createElement("ul");
    list.className = "list-clean";
    for (const entry of entries) {
      const item = document.createElement("li");
      item.textContent = `${entry.quantity}× ${entry.card.name} — ${entry.card.cost}`;
      list.append(item);
    }
    host.append(list);
  }

  $("selectedTerritories").replaceChildren(...state.territories.map(id => {
    const item = document.createElement("li");
    item.textContent = state.data.territories.find(entry => entry.id === id)?.name ?? id;
    return item;
  }));
  $("validationMessages").innerHTML = validation.valid
    ? `<p class="status-good"><strong>Legal v0.6.2 Deck.</strong></p>`
    : `<p class="status-bad"><strong>Resolve before play:</strong></p><ul>${validation.messages.map(message => `<li>${escapeHtml(message)}</li>`).join("")}</ul>`;
}

function validateDeck(selected, count, value) {
  const messages = [];
  if (count < 30) messages.push(`Add ${30 - count} more playable card${30 - count === 1 ? "" : "s"}.`);
  if (value > 60) messages.push(`Reduce deckbuilding value by ${value - 60}.`);
  if (state.territories.length !== 3) messages.push("Choose exactly three Territories.");
  const arenas = state.territories.filter(id => state.data.territories.find(entry => entry.id === id)?.arena).length;
  if (arenas > 1) messages.push("Choose no more than one Arena.");
  for (const entry of selected) if (entry.card.unique && entry.quantity > 1) messages.push(`${entry.card.name} is Unique.`);
  return { valid: messages.length === 0, messages };
}

function loadStarter() {
  const deck = selectedStarter();
  if (!deck) return;
  state.cards = {};
  for (const item of deck.cards) {
    const card = state.data.cards.find(entry => entry.name === item.name);
    if (!card) throw new Error(`Starter card missing from effective data: ${item.name}`);
    state.cards[card.id] = item.quantity;
  }
  state.territories = deck.territories.map(name => {
    const territory = state.data.territories.find(entry => entry.name === name);
    if (!territory) throw new Error(`Starter Territory missing: ${name}`);
    return territory.id;
  });
  state.deckName = deck.name;
  renderAll();
  save();
}

function exportDeck() {
  const deck = {
    version: V062_VERSION,
    name: state.deckName.trim() || selectedStarter()?.name || "Untitled Deck",
    factionId: state.factionId,
    leaderId: state.leaderId,
    cards: selectedCardEntries().map(entry => ({ name: entry.card.name, quantity: entry.quantity })),
    territories: state.territories.map(id => state.data.territories.find(entry => entry.id === id)?.name ?? id)
  };
  downloadJson(`${slug(deck.name)}.json`, deck);
}

function downloadJson(filename, value) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function selectedCardEntries() {
  return Object.entries(state.cards)
    .map(([id, quantity]) => ({ card: state.data.cards.find(entry => entry.id === id), quantity }))
    .filter(entry => entry.card)
    .sort((a, b) => a.card.allegiance.localeCompare(b.card.allegiance) || a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name));
}
function selectedFaction() { return state.data.factions.find(entry => entry.id === state.factionId) ?? state.data.factions[0]; }
function selectedLeader() { return selectedFaction().leaders.find(entry => slug(entry.name) === state.leaderId) ?? selectedFaction().leaders[0]; }
function selectedStarter() { return state.starters.find(entry => entry.factionId === state.factionId && entry.leaderId === state.leaderId) ?? null; }

function applyQuerySelection() {
  const params = new URLSearchParams(location.search);
  const faction = params.get("faction");
  const leader = params.get("leader");
  if (state.data.factions.some(entry => entry.id === faction)) state.factionId = faction;
  if (selectedFaction().leaders.some(entry => slug(entry.name) === leader)) state.leaderId = leader;
}

function restore() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value) return;
    Object.assign(state, {
      factionId: typeof value.factionId === "string" ? value.factionId : state.factionId,
      leaderId: typeof value.leaderId === "string" ? value.leaderId : state.leaderId,
      deckName: typeof value.deckName === "string" ? value.deckName : "",
      cards: value.cards && typeof value.cards === "object" ? value.cards : {},
      territories: Array.isArray(value.territories) ? value.territories : []
    });
  } catch {}
}
function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ factionId: state.factionId, leaderId: state.leaderId, deckName: state.deckName, cards: state.cards, territories: state.territories })); } catch {}
}
function option(value, label, selected) { const node = document.createElement("option"); node.value = value; node.textContent = label; node.selected = selected; return node; }
function slug(value) { return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
