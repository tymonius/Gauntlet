export const CURRENT_RULES_VERSION = "v0.7.1";

export function serialVersionToken(version) {
  const match = String(version || "").match(/^v(\d+)\.(\d+)\.(\d+)$/);
  if (!match) throw new Error(`Invalid playtest rules version: ${version}`);
  return match.slice(1).join("");
}

export function sessionSerialPrefixes(version) {
  const token = serialVersionToken(version);
  return Object.freeze({ game: `G${token}`, event: `EV${token}` });
}

const currentPrefixes = sessionSerialPrefixes(CURRENT_RULES_VERSION);
export const GAME_SERIAL_PREFIX = currentPrefixes.game;
export const EVENT_SERIAL_PREFIX = currentPrefixes.event;
export const SERIAL_PATTERN = /^(?:G|EV)\d{3,9}-[A-Z0-9]{6,12}$/;
