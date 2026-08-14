import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const generalRulesPath = 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md';
const releaseCanonicalPath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
const releaseReferencePath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Complete_Card_Reference.md';
const releaseRulebookPath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Rulebook.md';

const oldSanctionsSection = `## 5. Sanctions

A card whose title begins **Sanctions:** is a **Sanction**.

When a Sanction is played, placed, or banked because an opponent refused its owner's Terms:

- that opponent remains associated with that Sanction for as long as it remains in play; and
- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.

A Sanction may state additional removal conditions. Cards therefore do not need to repeat identification of the refusing opponent or the default expiration after later acceptance.`;

const newSanctionsSection = `## 5. Terms, Reactions, and Sanctions

### Terms effects

A **Terms** effect is used at the point printed on the card while its owner is offering Terms. Using a Terms effect does not spend or require an Action unless the card expressly says otherwise.

Outcome words such as **Accepted —** and **Refused —** may appear inside a Terms effect to divide its resolution. They are not separate standard-card effect headings.

### Reactions

A **Reaction** is played from Hand when its printed trigger occurs. Playing a Reaction does not spend or require an Action unless the card expressly says otherwise. Resolve the Reaction at the timing printed on the card.

### Sanctions

A card whose title begins **Sanctions:** is a **Sanction**.

Immediately after an opponent refuses your Terms, you may play a Sanction from your Hand at no cost unless that Sanction says otherwise. The Sanction's printed text determines whether it is banked, placed as an Overlay, or resolves in another way. A Sanction may also override this default timing or procedure.

When a Sanction is played, placed, or banked because an opponent refused its owner's Terms:

- that opponent remains associated with that Sanction for as long as it remains in play; and
- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.

A Sanction may state additional removal conditions. Cards therefore do not need to repeat the refusal trigger, identification of the refusing opponent, no-cost play, or the default expiration after later acceptance.`;

patchSection(generalRulesPath, oldSanctionsSection, newSanctionsSection);
patchRulebook();

const env = { ...process.env, V063_CANONICAL_DATA: releaseCanonicalPath, V063_CARD_REFERENCE: releaseReferencePath };
execFileSync(process.execPath, ['scripts/finalize-v063-canonical-data-candidate.mjs'], { stdio: 'inherit', env });
execFileSync(process.execPath, ['scripts/generate-v063-complete-card-reference-candidate.mjs'], { stdio: 'inherit', env });

console.log('Applied v0.6.3 standard-card heading vocabulary to rules, canonical data, and release-candidate card reference.');

function patchSection(path, oldText, newText) {
  const text = fs.readFileSync(path, 'utf8');
  if (text.includes(newText)) return;
  if (!text.includes(oldText)) throw new Error(`Expected section not found in ${path}`);
  fs.writeFileSync(path, text.replace(oldText, newText), 'utf8');
}

function patchRulebook() {
  let text = fs.readFileSync(releaseRulebookPath, 'utf8');

  const oldEffects = `- **Action:** play from Hand by taking an Action during Opening or Denouement unless the card names another legal timing.
- **Asset:** while banked, apply or use the Asset effect at its stated timing. A card with an Asset effect has an inherent Bank Action unless it prints a special banking procedure.
- **Gambit:** set from Hand during a battle.
- **Tactic:** choose from Reserve during a battle.
- **Gambit/Tactic:** the same printed effect is available when the card is committed as either a Gambit or a Tactic.

Only the printed effect being used applies unless a rule says otherwise. A Gambit, Tactic, or Gambit/Tactic effect with no later printed timing applies at that role's normal reveal stage.

Faction cards may contain other headings. Those headings use the procedure stated in the relevant faction rules and do not make a card eligible as a Gambit or Tactic unless it also has a Gambit, Tactic, or Gambit/Tactic effect.`;

  const newEffects = `- **Action:** play from Hand by taking an Action during Opening or Denouement unless the card names another legal timing.
- **Asset:** while banked, apply or use the Asset effect at its stated timing. A card with an Asset effect has an inherent Bank Action unless it prints a special banking procedure.
- **Gambit:** set from Hand during a battle.
- **Tactic:** choose from Reserve during a battle.
- **Gambit/Tactic:** the same printed effect is available when the card is committed as either a Gambit or a Tactic.
- **Mission:** an Intelligence Mission completion condition or effect, governed by the Intelligence faction rules.
- **Overlay:** the effect that applies while that card is placed on a Territory as an Overlay.
- **Terms:** use at the printed point while offering Terms; it does not require an Action unless the card says otherwise.
- **Sanctions:** after an opponent refuses your Terms, you may immediately play a Sanction from Hand at no cost unless the card says otherwise.
- **Reaction:** play from Hand when its printed trigger occurs; it does not require an Action unless the card says otherwise.

Only the printed effect being used applies unless a rule says otherwise. A Gambit, Tactic, or Gambit/Tactic effect with no later printed timing applies at that role's normal reveal stage. Terms, Sanctions, Reactions, Missions, and Overlays use their printed timing and applicable shared or faction rules.`;

  if (!text.includes(newEffects)) {
    if (!text.includes(oldEffects)) throw new Error(`Expected printed-effects block not found in ${releaseRulebookPath}`);
    text = text.replace(oldEffects, newEffects);
  }

  const rulebookOldSanctions = oldSanctionsSection.replace(/^## 5\./, '### 5.');
  const rulebookNewSanctions = newSanctionsSection.replace(/^## 5\./, '### 5.');
  if (!text.includes(rulebookNewSanctions)) {
    if (!text.includes(rulebookOldSanctions)) throw new Error(`Expected Sanctions section not found in ${releaseRulebookPath}`);
    text = text.replace(rulebookOldSanctions, rulebookNewSanctions);
  }

  fs.writeFileSync(releaseRulebookPath, text, 'utf8');
}
