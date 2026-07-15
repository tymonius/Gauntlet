const SOURCES = {
  neutral: {
    label: "Neutral",
    path: "../docs/Gauntlet_v0.6_Neutral_Card_Pool.md"
  },
  military: {
    label: "Military",
    path: "../releases/v0.6/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md",
    start: "# 6. Canonical Military card pool",
    end: "# 7. Card-pool summary"
  },
  diplomats: {
    label: "Diplomats",
    path: "../releases/v0.6/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md",
    start: "# 6. Canonical card pool",
    end: "# 7. Card-pool summary"
  },
  inquisition: {
    label: "Inquisition",
    path: "../releases/v0.6/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md",
    start: "## 6. Canonical Inquisition card pool",
    end: "## 7. Card-pool summary",
    headingLevel: 3
  }
};

const FACTIONS = [
  {
    id: "military",
    name: "Military",
    status: "ready",
    identity: "Conquest, battlefield momentum, and Orders.",
    resource: "Command (maximum 2)",
    victory: "Run the Gauntlet.",
    leaders: [
      {
        id: "general",
        name: "General",
        tagline: "Forward. Again.",
        role: "Attack · Forward pressure · Tempo",
        rules: [
          ["Command", "The first time each turn you win a battle, gain 1 Command, up to 2."],
          ["Onward — 1 Command", "Move one additional space this turn. This movement may initiate a battle."],
          ["Rally — 1 Command", "Before dice in a battle you initiated, add +1 to your battle total."],
          ["Rout — 2 Command", "After winning a battle you initiated, move one space toward the enemy Heartland. This may initiate another battle."]
        ]
      },
      {
        id: "commandant",
        name: "Commandant",
        tagline: "We hold. They break.",
        role: "Defense · Counterattack · Control",
        rules: [
          ["Command", "The first time each turn you win a battle, gain 1 Command, up to 2."],
          ["Entrench — 1 Command", "Before dice in a battle you did not initiate, add +1 to your battle total."],
          ["Repel — 1 Command", "After winning a battle you did not initiate, the defeated opponent retreats one additional space, if able."],
          ["Fortify — 2 Command", "After winning while occupying enemy Territory, capture it immediately."]
        ]
      }
    ]
  },
  {
    id: "diplomats",
    name: "Diplomats",
    status: "ready",
    identity: "Terms, Influence, concessions, and political legitimacy.",
    resource: "Influence (0–10)",
    victory: "Peace Treaty: begin your turn with five different ratified Proposals.",
    leaders: [
      {
        id: "ambassador",
        name: "Ambassador",
        tagline: "Words first. War last.",
        role: "Acceptance · Card flow · Voluntary agreement",
        rules: [
          ["Setup", "Set Influence to 1 and place the nine Proposals Proposal-side up."],
          ["Leverage", "Before dice following refused Terms, spend any available Influence for +1 battle total each."],
          ["Cordiality", "Once per turn, after the opponent accepts your Terms, draw one card."],
          ["Peace Treaty", "At the start of your turn, after captures, five different ratified Proposals win the game."]
        ]
      },
      {
        id: "senator",
        name: "Senator",
        tagline: "Procedure endures.",
        role: "Stakes · Resilience · Political capital",
        rules: [
          ["Setup", "Set Influence to 1 and place the nine Proposals Proposal-side up."],
          ["Leverage", "Before dice following refused Terms, spend any available Influence for +1 battle total each."],
          ["Political Capital", "Once per turn, when you would lose staked Influence after losing the battle, send cards from hand to your Graveyard to recover 1 staked Influence per card."],
          ["Peace Treaty", "At the start of your turn, after captures, five different ratified Proposals win the game."]
        ]
      }
    ]
  },
  {
    id: "inquisition",
    name: "Inquisition",
    status: "ready",
    identity: "Conviction, condemnation, Purge, and Purification.",
    resource: "Conviction (maximum 4)",
    victory: "Purification: the opponent begins a turn unable to draw from deck or discard.",
    leaders: [
      {
        id: "grand-inquisitor",
        name: "Grand Inquisitor",
        tagline: "We judge. We purge.",
        role: "Judgment · Purge · Resource destruction",
        rules: [
          ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
          ["Condemnation", "Opposing played battle-drawn cards go to the Graveyard after battles involving you instead of discard."],
          ["Final Judgment", "Once per turn after you win a battle, Purge immediately without using the Action opportunity and reduce its Conviction cost by 1, minimum 1."],
          ["Purification", "At the start of the opponent's turn, after their normal draw attempt, if no card can be drawn from deck or discard, you win."]
        ]
      },
      {
        id: "witch-hunter",
        name: "Witch Hunter",
        tagline: "You ran. I followed.",
        role: "Defense · Pursuit · Exposure",
        rules: [
          ["Conviction", "The first time each turn opposing cards enter the Graveyard after a battle involving you, gain 1 Conviction, up to 4."],
          ["Condemnation", "Opposing played battle-drawn cards go to the Graveyard after battles involving you instead of discard."],
          ["Relentless Pursuit", "Once per turn after an opponent loses a battle they initiated against you, spend 2 Conviction to end their turn, then move one space toward their Heartland; resolve any resulting battle immediately."],
          ["Purification", "At the start of the opponent's turn, after their normal draw attempt, if no card can be drawn from deck or discard, you win."]
        ]
      }
    ]
  },
  {
    id: "arcane",
    name: "Arcane",
    status: "developing",
    identity: "Rites, sacrifice, transformation, and Ritual victory.",
    resource: "In development",
    victory: "Ritual victory — in development.",
    leaders: [{ id: "alchemist", name: "Alchemist" }, { id: "spirit-walker", name: "Spirit Walker" }]
  },
  {
    id: "financiers",
    name: "Financiers",
    status: "developing",
    identity: "Capital, Treasury, Deeds, and Controlling Interest.",
    resource: "In development",
    victory: "Controlling Interest — in development.",
    leaders: [{ id: "banker", name: "Banker" }, { id: "executive", name: "Executive" }]
  },
  {
    id: "intelligence",
    name: "Intelligence",
    status: "developing",
    identity: "Intel, Missions, Surveillance, and Special Operation.",
    resource: "In development",
    victory: "Special Operation — in development.",
    leaders: [{ id: "ranger", name: "Ranger" }, { id: "spymaster", name: "Spymaster" }]
  }
];

const STORAGE_KEY = "gauntlet-v0.6-dev-decks";

const state = {
  cards: [],
  deckName: "",
  factionId: "military",
  leaderId: "general",
  deck: {},
  search: "",
  cost: "all",
  allegiance: "all",
  selectedCardId: null
};

const el = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  bindEvents();
  renderFactionOptions();

  try {
    const pools = await Promise.all(Object.entries(SOURCES).map(loadSource));
    state.cards = pools.flat().sort((a, b) => a.name.localeCompare(b.name));
    el.dataStatus.textContent = `${state.cards.length} active cards loaded`;
    el.app.hidden = false;
    renderAll();
  } catch (error) {
    console.error(error);
    el.dataStatus.textContent = "Source load failed";
    document.body.insertAdjacentHTML("beforeend", `<p class="warning-panel panel">Unable to load the active v0.6 Markdown sources. Serve the repository through a web server rather than opening this file directly.</p>`);
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

async function loadSource([faction, source]) {
  const response = await fetch(source.path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${source.path}: ${response.status}`);
  const markdown = await response.text();
  return parseCardPool(markdown, faction, source);
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
  const cards = [];

  headings.forEach((match, index) => {
    const name = match[1].trim();
    const start = match.index + match[0].length;
    const end = index + 1 < headings.length ? headings[index + 1].index : section.length;
    const block = section.slice(start, end);
    const costMatch = block.match(/\*\*Cost:\*\*\s*(\d+)/i);
    if (!costMatch) return;

    const complexity = block.match(/\*\*Complexity:\*\*\s*([^\n]+)/i)?.[1].replace(/\s+$/g, "").trim() || "Unspecified";
    const trait = block.match(/\*\*Trait:\*\*\s*([^\n]+)/i)?.[1].replace(/\s+$/g, "").trim() || "";
    const form = block.match(/\*\*Card form:\*\*\s*([^\n]+)/i)?.[1].replace(/\s+$/g, "").trim() || "";
    const unique = /\*\*Unique:\*\*/i.test(block);
    const sections = parseQuotedSections(block);

    cards.push({
      id: `${faction}-${slugify(name)}`,
      name,
      faction,
      factionLabel: source.label,
      cost: Number(costMatch[1]),
      complexity,
      trait,
      form,
      unique,
      sections,
      source: source.path
    });
  });

  return cards;
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

function renderAll() {
  el.deckName.value = state.deckName;
  el.factionSelect.value = state.factionId;
  renderLeaderOptions();
  renderLeader();
  renderAvailable();
  renderDeck();
  renderSavedDecks();
  validateAndRender();
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
  el.leaderSelect.innerHTML = faction.leaders.map(leader => `<option value="${leader.id}">${escapeHtml(leader.name)}</option>`).join("");
  if (!faction.leaders.some(leader => leader.id === state.leaderId)) state.leaderId = faction.leaders[0]?.id || "";
  el.leaderSelect.value = state.leaderId;
}

function renderLeader() {
  const faction = getFaction();
  const leader = faction.leaders.find(item => item.id === state.leaderId);
  if (!leader || !leader.rules) {
    el.leaderPreview.className = "leader-preview empty-state";
    el.leaderPreview.textContent = "Leader package is still in development.";
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
  state.factionId = nextFaction;
  state.leaderId = getFaction().leaders[0]?.id || "";
  state.selectedCardId = null;
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
  if (pointTotal > 60) errors.push(`Remove ${pointTotal - 60} deckbuilding value.`);

  entries.forEach(({ card, qty }) => {
    if (card.unique && qty > 1) errors.push(`${card.name} is Unique: maximum one copy.`);
    if (card.faction !== "neutral" && card.faction !== state.factionId) errors.push(`${card.name} is not legal for ${getFaction().name}.`);
  });

  return { cardCount, pointTotal, factionCardCount, errors, warnings, valid: errors.length === 0 };
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
  return {
    schema: "gauntlet-v0.6-dev-deck",
    schemaVersion: 1,
    gameVersion: "v0.6-dev",
    name: state.deckName.trim() || "Untitled v0.6 deck",
    factionId: state.factionId,
    leaderId: state.leaderId,
    cards: deckEntries().map(({ card, qty }) => ({ id: card.id, name: card.name, faction: card.faction, qty }))
  };
}

function saveDeck() {
  const data = currentDeckData();
  const saved = readSavedDecks();
  const key = data.name.toLowerCase();
  saved[key] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
  renderSavedDecks();
}

function renderSavedDecks() {
  const saved = readSavedDecks();
  const entries = Object.entries(saved).sort((a, b) => a[1].name.localeCompare(b[1].name));
  el.savedDeckSelect.innerHTML = entries.length
    ? entries.map(([key, deck]) => `<option value="${escapeHtml(key)}">${escapeHtml(deck.name)}</option>`).join("")
    : '<option value="">No saved v0.6 decks</option>';
  el.loadDeckButton.disabled = !entries.length;
  el.deleteDeckButton.disabled = !entries.length;
}

function readSavedDecks() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
  catch { return {}; }
}

function applyDeckData(data) {
  if (data.schema !== "gauntlet-v0.6-dev-deck") throw new Error("This is not a v0.6 development deck export.");
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
    "Territories: pending v0.6 integration"
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
