const STORAGE_KEY = "gauntlet-v062-start";
const TEACHING = {
  military: {
    aim: "Win battles, gain Command, and convert momentum into movement and Front Line control.",
    system: "Command, maximum 2. Gain 1 the first time each turn Military wins a battle.",
    actions: "No Faction Actions. Orders are Faction Abilities at their printed timings.",
    victory: "Run the Gauntlet.",
    recommended: "general",
    leaders: {
      general: "Attack repeatedly and carry momentum forward.",
      commandant: "Defend controlled ground and turn defensive wins into pressure."
    },
    opponent: "Track Command. Military may add movement, modify a battle, push a retreat farther, or advance its Front Line after a win. Invasion can enlarge an attacking Reserve and Tactic limit, but unused Invasion movement ends when a pending battle is created."
  },
  diplomats: {
    aim: "Offer Terms, ratify different Proposals, and reshape battles through agreement or refusal.",
    system: "Influence, 0–10; begin with 1. Leverage uses cumulative triangular costs.",
    actions: "No Faction Actions. Offer Terms during a pending battle before Onset.",
    victory: "Complete the Peace Treaty after five different Proposals are ratified.",
    recommended: "ambassador",
    leaders: { ambassador: "Gain card flow from accepted Terms.", senator: "Risk larger Stakes and preserve Influence after setbacks." },
    opponent: "Read the Proposal before accepting or refusing. Accepted Terms prevent the battle; refusal proceeds to Onset. Détente rewards acceptance only when the Proposal was already ratified when offered."
  },
  financiers: {
    aim: "Build Capital and Treasury value, buy Deeds, and combine ownership with territorial pressure.",
    system: "Begin with 2 Capital. The Capital limit is Territories controlled plus Treasury value.",
    actions: "Treasury, Deed purchase, Play the Market, and Hostile Takeover are Faction Actions during Denouement.",
    victory: "Own the Deeds to every Territory through Controlling Interest.",
    recommended: "executive",
    leaders: { banker: "Use controlled collateral for purchases.", executive: "Convert offensive Occupation into Deed ownership and Front Line control." },
    opponent: "Capital, Treasury, and Deeds are public. Financial Capacity may give the Financier both Action phases, provided one Action is a Financier Faction Action. Deed ownership does not itself equal Territory control."
  },
  intelligence: {
    aim: "Complete Missions, gain Intel and Operation Progress, and prepare a Special Operation.",
    system: "Intel and Operation Progress are public; Mission identity is hidden.",
    actions: "Start, complete, or abort Missions and start or complete a Special Operation during Denouement.",
    victory: "Complete a ready Special Operation.",
    recommended: "ranger",
    leaders: { ranger: "Use Fieldcraft and terrain knowledge for flexible operations.", spymaster: "Chain Missions through Mission Control." },
    opponent: "Mission identity is hidden, but Intel and Operation Progress are public. Intelligence may reveal and interfere with a face-down Gambit and later with face-down Tactics. Replacements do not create a new information window."
  },
  mystics: {
    aim: "Complete three Rites, unlock Arcane abilities, then complete the Ritual of Ascendance.",
    system: "Three public Rites and bound cards; all thirteen Mystics cards are Arcane.",
    actions: "Begin a Rite or the Ritual during Denouement, except Nature's Altar may permit Begin a Rite during Opening.",
    victory: "Initiate and win a battle while the three Ritual cards remain bound.",
    recommended: "spirit-walker",
    leaders: { alchemist: "Replace deliberate sacrifice with card flow.", "spirit-walker": "Protect Rite and Ritual progress after a loss." },
    opponent: "Completed Rites and face-up bound cards are public. The Spirit Walker may prevent interruption by sacrificing an Arcane card with value 1, 2, 3, or 4 according to progress. Nature's Altar requires token presence to begin and control at completion timing."
  },
  inquisition: {
    aim: "Build Conviction, move opposing cards permanently into the Graveyard, and use Purge to remove options.",
    system: "Conviction, maximum 4. Purge can permit one Action in each phase when one is Purge.",
    actions: "Purge is a Faction Action during Opening or Denouement, no more than once per turn.",
    victory: "Achieve Purification when the opponent cannot make the normal start-of-turn draw.",
    recommended: "grand-inquisitor",
    leaders: { "grand-inquisitor": "Convert battle wins into discounted Purges.", "witch-hunter": "Punish failed attacks with immediate pursuit." },
    opponent: "Opposing Tactics normally go to the Graveyard in battles against Inquisition. Track Conviction before playing Arcane cards or attacking the Witch Hunter. Martyrdom changes remaining Reserve destinations but does not prevent the loss."
  }
};

const state = { data: null, starters: [], factionId: "", leaderId: "" };
const $ = id => document.getElementById(id);

init().catch(error => {
  console.error(error);
  $("loading").textContent = `Unable to load the published v0.6.2 release: ${error.message}`;
  $("loading").classList.add("status-bad");
});

async function init() {
  const [data, starterData] = await Promise.all([
    fetch("../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json", { cache: "no-store" }).then(assertJson),
    fetch("../../releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Starter_Decks.json", { cache: "no-store" }).then(assertJson)
  ]);
  state.data = data;
  state.starters = starterData.decks ?? [];
  restore();
  renderFactionChoices();
  renderOpponentCards();
  $("loading").classList.add("hidden");
  $("choiceApp").classList.remove("hidden");
  renderSelection();
}

async function assertJson(response) {
  if (!response.ok) throw new Error(`Starter catalog returned ${response.status}`);
  return response.json();
}

function renderFactionChoices() {
  const host = $("factionChoices");
  host.replaceChildren();
  for (const faction of state.data.factions) {
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `<input type="radio" name="faction" value="${faction.id}"><strong>${escapeHtml(faction.name)}</strong><span class="muted">${escapeHtml(TEACHING[faction.id].aim)}</span>`;
    const input = label.querySelector("input");
    input.checked = state.factionId === faction.id;
    input.addEventListener("change", () => {
      state.factionId = faction.id;
      state.leaderId = "";
      save();
      renderFactionChoices();
      renderLeaderChoices();
      renderSelection();
    });
    host.append(label);
  }
  renderLeaderChoices();
}

function renderLeaderChoices() {
  const section = $("leaderSection");
  const host = $("leaderChoices");
  host.replaceChildren();
  const faction = state.data?.factions.find(entry => entry.id === state.factionId);
  if (!faction) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  for (const leader of faction.leaders) {
    const id = slug(leader.name);
    const recommended = TEACHING[faction.id].recommended === id;
    const label = document.createElement("label");
    label.className = "choice";
    label.innerHTML = `<input type="radio" name="leader" value="${id}"><strong>${escapeHtml(leader.name)}${recommended ? " · recommended first" : ""}</strong><span class="muted">${escapeHtml(TEACHING[faction.id].leaders[id] ?? "")}</span>`;
    const input = label.querySelector("input");
    input.checked = state.leaderId === id;
    input.addEventListener("change", () => {
      state.leaderId = id;
      save();
      renderLeaderChoices();
      renderSelection();
    });
    host.append(label);
  }
}

function renderSelection() {
  const faction = state.data?.factions.find(entry => entry.id === state.factionId);
  const leader = faction?.leaders.find(entry => slug(entry.name) === state.leaderId);
  const deck = state.starters.find(entry => entry.factionId === state.factionId && entry.leaderId === state.leaderId);
  const section = $("selection");
  if (!faction || !leader || !deck) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  const teaching = TEACHING[faction.id];
  $("selectionTitle").textContent = `${leader.name} of the ${faction.name}`;
  $("ownFaction").innerHTML = `<p><strong>Aim:</strong> ${escapeHtml(teaching.aim)}</p><p><strong>System:</strong> ${escapeHtml(teaching.system)}</p><p><strong>Faction procedure:</strong> ${escapeHtml(teaching.actions)}</p><p><strong>Additional victory:</strong> ${escapeHtml(teaching.victory)}</p><p><strong>Leader:</strong> ${escapeHtml(teaching.leaders[state.leaderId])}</p>`;
  $("starterTitle").textContent = deck.name;
  $("starterSummary").textContent = deck.summary;
  $("starterOpening").innerHTML = `<strong>Opening plan:</strong> ${escapeHtml(deck.openingPlan ?? "Follow the Deck's signature package and establish the faction engine early.")}`;
  $("starterTip").innerHTML = `<strong>First-game tip:</strong> ${escapeHtml(deck.firstGameTip)}`;
  $("starterTerritories").textContent = deck.territories.join(" → ");
  $("openDeckbuilder").onclick = () => {
    const url = new URL("../deckbuilder/", window.location.href);
    url.searchParams.set("faction", state.factionId);
    url.searchParams.set("leader", state.leaderId);
    url.searchParams.set("starter", "1");
    url.searchParams.set("source", "start");
    window.location.assign(url.href);
  };
}

function renderOpponentCards() {
  const host = $("opponentCards");
  host.replaceChildren();
  for (const faction of state.data.factions) {
    const article = document.createElement("article");
    article.className = "card";
    article.innerHTML = `<h3>${escapeHtml(faction.name)}</h3><p>${escapeHtml(TEACHING[faction.id].opponent)}</p>`;
    host.append(article);
  }
}

function restore() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!value) return;
    if (TEACHING[value.factionId]) state.factionId = value.factionId;
    if (typeof value.leaderId === "string") state.leaderId = value.leaderId;
  } catch {}
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ factionId: state.factionId, leaderId: state.leaderId })); } catch {}
}

function slug(value) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
