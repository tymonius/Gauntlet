(() => {
  const VERSION = "v0.6.3";
  const SOURCE_VERSION = "clean-v0.6.3-downstream";
  const CANONICAL_URL = "../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json";
  const oldStorageKey = "gauntlet-v0.6.1-decks";
  const storageKey = "gauntlet-v0.6.3-decks";
  const nativeFetch = window.fetch.bind(window);
  let canonicalPromise = null;
  let hydrated = false;

  const originalStorage = {
    getItem: Storage.prototype.getItem,
    setItem: Storage.prototype.setItem,
    removeItem: Storage.prototype.removeItem
  };
  const mappedKey = key => key === oldStorageKey ? storageKey : key;
  Storage.prototype.getItem = function (key) { return originalStorage.getItem.call(this, mappedKey(key)); };
  Storage.prototype.setItem = function (key, value) { return originalStorage.setItem.call(this, mappedKey(key), value); };
  Storage.prototype.removeItem = function (key) { return originalStorage.removeItem.call(this, mappedKey(key)); };

  function canonicalData() {
    if (!canonicalPromise) {
      canonicalPromise = nativeFetch(CANONICAL_URL, { cache: "no-store" }).then(async response => {
        if (!response.ok) throw new Error(`Failed to load ${CANONICAL_URL}: ${response.status}`);
        const data = await response.json();
        if (![VERSION, SOURCE_VERSION].includes(data?.version)) throw new Error(`Expected current v0.6.3 source, received ${data?.version || "unknown"}.`);
        if (data.cards?.length !== 128 || data.territories?.length !== 25) throw new Error("Published v0.6.3 canonical data is incomplete.");
        return data;
      });
    }
    return canonicalPromise;
  }

  function hydrateFactions(data) {
    if (hydrated) return;
    hydrated = true;
    for (const published of data.factions || []) {
      const target = FACTIONS.find(faction => faction.id === published.id);
      if (!target) continue;
      target.status = "ready";
      target.resource = published.resource || target.resource;
      target.victory = published.victory || target.victory;
      target.leaders = (published.leaders || []).map(leader => ({
        id: slugify(leader.name),
        name: leader.name,
        tagline: "",
        role: "v0.6.3 Leader",
        rules: []
      }));
    }
  }

  const sourceFor = (id, label) => ({ label, path: CANONICAL_URL, canonicalFaction: id });
  Object.assign(SOURCES, {
    neutral: sourceFor("neutral", "Neutral"),
    military: sourceFor("military", "Military"),
    diplomats: sourceFor("diplomats", "Diplomats"),
    financiers: sourceFor("financiers", "Financiers"),
    intelligence: sourceFor("intelligence", "Intelligence"),
    mystics: sourceFor("mystics", "Mystics"),
    inquisition: sourceFor("inquisition", "Inquisition")
  });

  loadSource = async function loadV063Source([faction, source]) {
    const data = await canonicalData();
    hydrateFactions(data);
    return (data.cards || [])
      .filter(card => slugify(card.allegiance || "Neutral") === faction)
      .map(card => ({
        id: card.id || `${faction}-${slugify(card.name)}`,
        name: card.name,
        faction,
        factionLabel: card.allegiance || source.label,
        cost: Number(card.cost),
        complexity: card.complexity || "",
        trait: card.trait || "",
        form: card.card_form || "",
        unique: Boolean(card.unique),
        sections: Object.fromEntries((card.effects || []).map(effect => [effect.label || "Text", effect.text || ""])),
        source: `../card-reference/#${slugify(card.name)}`
      }));
  };

  function territoryMarkdown(data) {
    return (data.territories || []).map(territory => {
      const text = String(territory.text || territory.effects?.map(effect => effect.text).filter(Boolean).join("\n") || "")
        .split("\n").map(line => `> ${line}`).join("\n");
      return `## ${territory.number}. ${territory.name}\n\n**Complexity:** ${territory.complexity || "Published"}\n\n**Status:** Approved\n\n${text}`;
    }).join("\n\n");
  }

  window.fetch = async function v063AwareFetch(input, init) {
    const url = typeof input === "string" ? input : input?.url || "";
    if (url.includes("Gauntlet_v0.6.1_Territory_Pool.md")) {
      const data = await canonicalData();
      return new Response(territoryMarkdown(data), { status: 200, headers: { "Content-Type": "text/markdown; charset=utf-8" } });
    }
    return nativeFetch(input, init);
  };

  state.deckName = "Untitled v0.6.3 Deck";

  const baseCurrentDeckData = currentDeckData;
  currentDeckData = function currentV063DeckData() {
    const data = baseCurrentDeckData();
    data.gameVersion = VERSION;
    if (!data.name || data.name === "Untitled v0.6.1 Deck") data.name = "Untitled v0.6.3 Deck";
    return data;
  };

  const baseRenderLeader = renderLeader;
  renderLeader = function renderV063Leader() {
    const faction = getFaction();
    const leader = faction?.leaders.find(item => item.id === state.leaderId);
    if (!leader) return baseRenderLeader();
    el.leaderPreview.className = "leader-preview";
    el.leaderPreview.innerHTML = `
      <h3>${escapeHtml(leader.name)} <span class="mini-pill">${escapeHtml(faction.name)}</span></h3>
      <p><strong>v0.6.3 Leader</strong></p>
      <p>${escapeHtml(faction.identity || "")} <strong>Resource:</strong> ${escapeHtml(faction.resource || "")} <strong>Victory:</strong> ${escapeHtml(faction.victory || "")}</p>
      <p class="muted">See the current faction guide or Rulebook for complete Leader abilities.</p>
    `;
  };

  document.addEventListener("DOMContentLoaded", () => {
    document.title = "Gauntlet v0.6.3 Deckbuilder";
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = "Build, validate, save, and print a Gauntlet v0.6.3 Deck.";
    const eyebrow = document.querySelector(".tool-hero .eyebrow");
    if (eyebrow) eyebrow.textContent = "Playtest tool · v0.6.3";
    const nameInput = document.getElementById("deckName");
    if (nameInput && (!nameInput.value || /Untitled v0\.6\.1 Deck/.test(nameInput.value))) nameInput.value = state.deckName;
    const importField = document.getElementById("importJson");
    if (importField) importField.placeholder = "Paste an exported v0.6.3 Deck JSON here";
    document.querySelectorAll('a[href="../releases/v0.6.1/"]').forEach(link => {
      link.href = "../releases/v0.6.3/";
      link.textContent = "v0.6.3 release";
    });
    document.querySelectorAll('a[href="../rulebook/"]').forEach(link => link.href = "../rulebook/");
    document.querySelectorAll('a[href="../start/"]').forEach(link => link.href = "../start/");
    document.querySelectorAll('a[href="../card-reference/"]').forEach(link => link.href = "../card-reference/");

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      node.nodeValue = node.nodeValue
        .replaceAll("v0.6.1", "v0.6.3")
        .replaceAll("active working text", "current text")
        .replaceAll("development build", "playtest build");
    }

    const importButton = document.getElementById("importJsonButton");
    if (importButton) {
      const replacement = importButton.cloneNode(true);
      importButton.replaceWith(replacement);
      replacement.addEventListener("click", () => {
        const field = document.getElementById("importJson");
        try {
          const snapshot = JSON.parse(field.value);
          if (snapshot.gameVersion && snapshot.gameVersion !== VERSION) throw new Error(`This Deck was exported for ${snapshot.gameVersion}.`);
          snapshot.gameVersion = VERSION;
          applyDeckData(snapshot);
          field.value = "";
        } catch (error) {
          window.alert(`Could not import Deck: ${error.message}`);
        }
      });
    }
  });
})();
