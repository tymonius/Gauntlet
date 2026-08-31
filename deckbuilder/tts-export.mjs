export const TTS_DECK_CODE_PREFIX = "GDL1:";
export const TTS_DECK_EXPORT_MIN_VERSION = "v0.7.1";

function parseReleaseVersion(value, allowCandidate = false) {
  const pattern = allowCandidate
    ? /^v?(\d+)\.(\d+)\.(\d+)(?:-candidate)?$/
    : /^v?(\d+)\.(\d+)\.(\d+)$/;
  const match = pattern.exec(String(value || "").trim());
  return match ? match.slice(1, 4).map(Number) : null;
}

function versionAtLeastMinimum(current, minimum) {
  return versionAtLeastMinimum(current, minimum);
}

export function isTtsDeckExportQaAvailable(version) {
  if (!/-candidate$/.test(String(version || "").trim())) return false;
  const current = parseReleaseVersion(version, true);
  const minimum = parseReleaseVersion(TTS_DECK_EXPORT_MIN_VERSION);
  return versionAtLeastMinimum(current, minimum);
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
  if (String(deck.factionId || "").trim().toLowerCase() === "mystics") {
    throw new Error("Mystics Tabletop Simulator export is temporarily unavailable until selected-Rite assembly is supported. Export JSON to preserve the selected Rites.");
  }
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

async function copyDeckCode(button, allowCandidateQa = false) {
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
    const available = isTtsDeckExportAvailable(deck?.gameVersion)
      || (allowCandidateQa && isTtsDeckExportQaAvailable(deck?.gameVersion));
    if (!available) {
      window.alert(`Tabletop Simulator Deck export begins with stable ${TTS_DECK_EXPORT_MIN_VERSION}.`);
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
  const button = document.getElementById("copyTtsDeckCodeButton");
  const help = document.getElementById("ttsDeckExportHelp");
  if (!button) return;

  try {
    const { loadGameRuleset, rulesetModeFromUrl } = await import("../game-data/ruleset.mjs");
    const mode = rulesetModeFromUrl();
    const selectedGame = await loadGameRuleset(mode);
    const params = new URLSearchParams(window.location.search);
    const candidateQa = mode === "candidate"
      && params.get("tts-qa") === "1"
      && isTtsDeckExportQaAvailable(selectedGame?.version);
    const stable = isTtsDeckExportAvailable(selectedGame?.version);

    if (candidateQa) {
      button.hidden = false;
      button.textContent = "Copy TTS QA Deck Code";
      button.title = "Copy a v0.7.1-candidate Deck Code for the private TTS QA build.";
      if (help) {
        help.textContent = "QA mode is active. Build and validate a candidate Deck, copy its TTS Deck Code here, then paste it into Deck Import in the private TTS candidate build.";
      }
      button.addEventListener("click", () => copyDeckCode(button, true));
      return;
    }

    if (!stable) return;

    button.hidden = false;
    button.textContent = "Copy TTS Deck Code";
    button.title = "Copy a compact Deck Code to paste into the Gauntlet TTS mod.";
    if (help) {
      help.textContent = "Build and validate your Deck, copy its TTS Deck Code here, then paste that code into Deck Import in Tabletop Simulator.";
    }
    button.addEventListener("click", () => copyDeckCode(button));
  } catch {
    return;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => { void installDeckCodeButton(); });
}
