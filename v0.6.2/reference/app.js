import { loadV062CanonicalData, V062_VERSION } from "../data/canonical-data.js";

const state = { data: null, search: "", allegiance: "all", cost: "all" };
const $ = id => document.getElementById(id);

init().catch(error => {
  console.error(error);
  $("status").innerHTML = `<strong class="status-bad">Reference load failed.</strong><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  state.data = await loadV062CanonicalData("../../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json");
  $("status").innerHTML = `<strong class="status-good">${escapeHtml(V062_VERSION)}</strong><p>${state.data.cards.length} cards · ${state.data.territories.length} Territories · ${state.data.proposals.length} Proposals</p>`;
  $("cardCount").textContent = state.data.cards.length;
  $("cardAllegiance").append(...Object.keys(state.data.card_pool_summary).map(name => option(name, name)));
  $("cardSearch").addEventListener("input", () => { state.search = $("cardSearch").value.toLowerCase().trim(); renderCards(); });
  $("cardAllegiance").addEventListener("change", () => { state.allegiance = $("cardAllegiance").value; renderCards(); });
  $("cardCost").addEventListener("change", () => { state.cost = $("cardCost").value; renderCards(); });
  renderCards();
  renderTerritories();
  renderProposals();
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
