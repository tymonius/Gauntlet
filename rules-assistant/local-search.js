import * as core from "./local-search-core.js";

export * from "./local-search-core.js";

const FIRST_PLAYER_ROLL_FOCUS = /(?:\b(?:first player|first turn|go(?:es|ing)? first|who starts?|determin(?:e|es|ed|ing) (?:the )?first player|decid(?:e|es|ed|ing) who starts?)\b[\s\S]{0,120}\b(?:roll|rolled|tie|tied|same number)\b|\b(?:roll|rolled|tie|tied|same number)\b[\s\S]{0,120}\b(?:first player|first turn|go(?:es|ing)? first|who starts?|determin(?:e|es|ed|ing) (?:the )?first player|decid(?:e|es|ed|ing) who starts?)\b)/i;

/**
 * Preserve the generic retrieval engine while adding narrowly scoped phrase
 * expansion for questions about the setup roll that determines first player.
 * The released Setup rule uses "Determine first player" / "Reroll ties",
 * wording that ordinary player paraphrases often do not share.
 */
export function retrieveRules(corpus, query, options = {}) {
  const raw = String(query || "");
  if (!FIRST_PLAYER_ROLL_FOCUS.test(raw)) {
    return core.retrieveRules(corpus, query, options);
  }

  return core.retrieveRules(
    corpus,
    `${raw} setup determine first player higher result takes the first turn reroll ties`,
    options,
  );
}
