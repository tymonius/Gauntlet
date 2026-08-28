export const TTS_DECK_CODE_PREFIX = "GDL1:";
export const TTS_DECK_EXPORT_MIN_VERSION = "v0.7.1";

function parseReleaseVersion(value) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value || "").trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

export function isTtsDeckExportAvailable(version) {
  const current = parseReleaseVersion(version);
  const minimum = parseReleaseVersion(TTS_DECK_EXPORT_MIN_VERSION);
  if (!current || !minimum) return false;
  for (let index = 0; index < 3; index += 1) {
    if (current[index] > minimum[index]) return true;
    if (current[index] < minimum[index]) return false;
  }
  return true;
}

function requiredString(value, label) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`Missing ${label}.`);
  return normalized;
}

function compactCards(cards) {
  return (cards || []).map((card) => {
    const id = requiredString(card?.id, "card id");
    const quantity = Number(card?.qty);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid quantity for ${id}.`);
    }
    return [id, quantity];
  });
}

function compactTerritories(territories) {
  return (territories || []).map((territory) => requiredString(
    typeof territory === "string" ? territory : territory?.id,
    "Territory id"
  ));
}

export function buildTtsDeckPayload(deck) {
  if (!deck || typeof deck !== "object") throw new Error("Deck data is required.");
  return {
    v: requiredString(deck.gameVersion, "game version"),
    n: requiredString(deck.name, "deck name"),
    f: requiredString(deck.factionId, "faction"),
    l: requiredString(deck.leaderId, "leader"),
    c: compactCards(deck.cards),
    t: compactTerritories(deck.territories)
  };
}

export function encodeTtsDeckCode(deck) {
  return `${TTS_DECK_CODE_PREFIX}${JSON.stringify(buildTtsDeckPayload(deck))}`;
}

export function decodeTtsDeckCode(code) {
  const normalized = String(code || "").trim();
  if (!normalized.startsWith(TTS_DECK_CODE_PREFIX)) {
    throw new Error("This is not a Gauntlet TTS Deck Code.");
  }
  return JSON.parse(normalized.slice(TTS_DECK_CODE_PREFIX.length));
}

async function copyDeckCode(button) {
  const currentDeckData = window.currentDeckData;
  const validateDeck = window.validateDeck;
  if (typeof currentDeckData !== "function") {
    window.alert("Deck data is not ready yet.");
    return;
  }

  const validation = typeof validateDeck === "function" ? validateDeck() : null;
  if (validation && !validation.valid) {
    const details = (validation.errors || []).join("\n");
    window.alert(`Finish validating this Deck before exporting it to Tabletop Simulator.${details ? `\n\n${details}` : ""}`);
    return;
  }

  let code;
  try {
    const deck = currentDeckData();
    if (!isTtsDeckExportAvailable(deck?.gameVersion)) {
      window.alert(`Tabletop Simulator Deck export begins with ${TTS_DECK_EXPORT_MIN_VERSION}.`);
      return;
    }
    code = encodeTtsDeckCode(deck);
  } catch (error) {
    window.alert(error.message || "Unable to create a TTS Deck Code.");
    return;
  }

  try {
    await navigator.clipboard.writeText(code);
    const original = button.textContent;
    button.textContent = "Copied for TTS";
    window.setTimeout(() => { button.textContent = original; }, 1800);
  } catch {
    window.prompt("Copy this Gauntlet TTS Deck Code:", code);
  }
}

async function installDeckCodeButton() {
  try {
    const response = await fetch("../game-data/current-game.json", { cache: "no-store" });
    if (!response.ok) return;
    const currentGame = await response.json();
    if (!isTtsDeckExportAvailable(currentGame?.version)) return;
  } catch {
    return;
  }

  const exportJsonButton = document.getElementById("exportJsonButton");
  if (!exportJsonButton || document.getElementById("copyTtsDeckCodeButton")) return;

  const button = document.createElement("button");
  button.id = "copyTtsDeckCodeButton";
  button.type = "button";
  button.className = "secondary";
  button.textContent = "Copy for Tabletop Simulator";
  button.title = "Copy a compact Deck Code to paste into the Gauntlet TTS mod.";
  button.addEventListener("click", () => copyDeckCode(button));
  exportJsonButton.parentElement?.append(button);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => { void installDeckCodeButton(); });
}
