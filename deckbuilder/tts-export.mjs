export const TTS_DECK_CODE_PREFIX = "GDL1:";

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
    code = encodeTtsDeckCode(currentDeckData());
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

function installDeckCodeButton() {
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
  document.addEventListener("DOMContentLoaded", installDeckCodeButton);
}
