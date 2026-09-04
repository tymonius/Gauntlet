import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  deriveRuleFacts,
  ruleNumberWord,
  synchronizeKnownRulebookClaims,
} from '../rulebook/player-facing/rule-facts.js';
import {
  applyV070CanonicalCorrections,
  applyV070RulebookCorrections,
} from '../rulebook/player-facing/v070-corrections.js';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Diplomat Peace Treaty threshold', () => {
  it('keeps current player-facing surfaces aligned with the structured threshold', () => {
    const currentGame = JSON.parse(read('game-data/current-game.json'));
    const threshold = deriveRuleFacts(currentGame)['diplomats.peace_treaty_threshold'];
    const thresholdWord = ruleNumberWord(threshold);

    const rulebook = read('rulebook/player-facing/current-rulebook.md');
    expect(rulebook).toContain(
      `${thresholdWord}<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals`,
    );

    for (const path of [
      'legacy/public-compatibility/faction-sheets/diplomat.js',
      'rules-assistant/answer-presentation.js',
      'rules-assistant/rules-deterministic.js',
    ]) {
      const source = read(path);
      expect(source, path).toContain(`${thresholdWord} different Proposals`);
    }
  });

  it('keeps maintained v0.7.0 prose aligned with its own canonical threshold', () => {
    const canonical = applyV070CanonicalCorrections(
      JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json')),
    );
    const threshold = deriveRuleFacts(canonical)['diplomats.peace_treaty_threshold'];
    const thresholdWord = ruleNumberWord(threshold);
    const source = read('releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md');
    const semantic = applyV070RulebookCorrections(source);
    const corrected = synchronizeKnownRulebookClaims(semantic, canonical).output;

    expect(corrected).toContain(`Ratify ${thresholdWord} different Proposals`);
    expect(corrected).toContain(`if ${thresholdWord} different Proposals are ratified`);
  });

  it('repairs a legacy threshold from canonical data rather than a hard-coded replacement', () => {
    const canonical = applyV070CanonicalCorrections(
      JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json')),
    );
    const threshold = deriveRuleFacts(canonical)['diplomats.peace_treaty_threshold'];
    const thresholdWord = ruleNumberWord(threshold);
    const legacySnippet = [
      'Accepted or successfully imposed Proposals become Treaty Articles. Ratify five different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.',
      "At the start of the Diplomat's turn, after the Capture step and before the Draw step, if five different Proposals are ratified, the Diplomat wins through the Peace Treaty.",
    ].join('\n');

    const corrected = synchronizeKnownRulebookClaims(legacySnippet, canonical).output;
    expect(corrected).toContain(`Ratify ${thresholdWord} different Proposals`);
    expect(corrected).toContain(`if ${thresholdWord} different Proposals are ratified`);
  });
});
