const V062_VERSION = "v0.6.2";
const REFERENCE_REVISION = "20260806-1";
const REQUIRED_V062_CARD_ALLEGIANCES = {
  Landslide: "Neutral",
  Invasion: "Military",
  "Détente": "Diplomats",
  "Compound Interest": "Financiers",
  "Extraordinary Rendition": "Intelligence",
  "Nature's Altar": "Mystics",
  Martyrdom: "Inquisition",
};

const SURFACE_VERSION = "v0.6.2";
const state = { data: null, search: "", allegiance: "all", cost: "all" };
const $ = id => document.getElementById(id);

init().catch(error => {
  console.error(error);
  $("status").innerHTML = `<strong class="status-bad">Reference load failed.</strong><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  state.data = await fetch(`../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json?rev=${REFERENCE_REVISION}`, { cache: "no-store" }).then(assertJson);
  validateReferenceData(state.data);
  $("status").innerHTML = `<strong class="status-good">Published ${escapeHtml(SURFACE_VERSION)}</strong><p>${state.data.cards.length} cards · ${state.data.territories.length} Territories · ${state.data.proposals.length} Proposals</p>`;
  $("cardCount").textContent = state.data.cards.length;
  $("cardAllegiance").append(...Object.keys(state.data.card_pool_summary).map(name => option(name, name)));
  $("cardSearch").addEventListener("input", () => { state.search = $("cardSearch").value.toLowerCase().trim(); renderCards(); });
  $("cardAllegiance").addEventListener("change", () => { state.allegiance = $("cardAllegiance").value; renderCards(); });
  $("cardCost").addEventListener("change", () => { state.cost = $("cardCost").value; renderCards(); });
  renderCards();
  renderTerritories();
  renderProposals();
}

async function assertJson(response) {
  if (!response.ok) throw new Error(`Canonical data returned ${response.status}`);
  return response.json();
}

function validateReferenceData(data) {
  if (data?.version !== V062_VERSION) throw new Error(`Expected ${V062_VERSION} canonical data, received ${data?.version ?? "unknown version"}.`);
  if (!Array.isArray(data.cards) || data.cards.length !== 128) throw new Error(`Expected 128 v0.6.2 cards, received ${data?.cards?.length ?? 0}.`);
  const expectedPools = { Neutral: 50, Military: 13, Diplomats: 13, Financiers: 13, Intelligence: 13, Mystics: 13, Inquisition: 13 };
  for (const [allegiance, expected] of Object.entries(expectedPools)) {
    const actual = data.cards.filter(card => card.allegiance === allegiance).length;
    if (actual !== expected) throw new Error(`Expected ${expected} ${allegiance} cards, received ${actual}.`);
  }
  for (const [name, allegiance] of Object.entries(REQUIRED_V062_CARD_ALLEGIANCES)) {
    const card = data.cards.find(entry => entry.name === name);
    if (!card) throw new Error(`Published v0.6.2 Card Reference is missing ${name}.`);
    if (card.allegiance !== allegiance) throw new Error(`${name} must be ${allegiance}; received ${card.allegiance}.`);
  }
}

function renderCards() {
  const cards = state.data.cards.filter(card => {
    if (state.allegiance !== "all" && card.allegiance !== state.allegiance) return false;
    if (state.cost !== "all" && String(card.cost) !== state.cost) return false;
    const haystack = `${card.name} ${card.allegiance} ${card.trait ?? ""} ${(card.effects ?? []).map(effect => `${effect.label} ${effect.text}`).join(" ")}`.toLowerCase();
    return !state.search || haystack.includes(state.search);
  });
  const host = $("cardEntries");
  host.replaceChildren();
  for (const card of cards) {
    const article = document.createElement("article");
    article.className = "panel reference-entry";
    article.innerHTML = `<p class="eyebrow">${escapeHtml(card.allegiance)} · value ${card.cost}${card.trait ? ` · ${escapeHtml(card.trait)}` : ""}${card.unique ? " · Unique" : ""}</p><h2>${escapeHtml(card.name)}</h2>${(card.effects ?? []).map(effect => `<div class="mode"><strong>${escapeHtml(effect.label)}</strong>${formatText(effect.text)}</div>`).join("")}${card.rules_notes?.length ? `<ul>${card.rules_notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ul>` : ""}`;
    host.append(article);
  }
}

function renderTerritories() {
  const host = $("territoryEntries");
  host.replaceChildren();
  for (const territory of state.data.territories) {
    const article = document.createElement("article");
    article.className = "card";
    article.innerHTML = `<p class="eyebrow">${territory.arena ? "Arena" : "Territory"} · ${territory.number}</p><h3>${escapeHtml(territory.name)}</h3><p>${formatText(territory.text)}</p>`;
    host.append(article);
  }
}

function renderProposals() {
  const host = $("proposalEntries");
  host.replaceChildren();
  for (const proposal of state.data.proposals) {
    const article = document.createElement("article");
    article.className = "card";
    article.innerHTML = `<p class="eyebrow">Stake ${proposal.stake}</p><h3>${escapeHtml(proposal.name)}</h3><p><strong>Requirement:</strong> ${escapeHtml(proposal.requirement)}</p><div class="mode"><strong>Accepted</strong>${formatText(proposal.accepted)}</div><div class="mode"><strong>Refused</strong>${formatText(proposal.refused)}</div>`;
    host.append(article);
  }
}

function option(value, label) { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; }
function formatText(value) { return escapeHtml(value).replaceAll("\n", "<br>"); }
function escapeHtml(value) { return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
