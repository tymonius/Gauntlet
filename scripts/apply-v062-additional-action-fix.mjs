import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function write(relativePath, content) {
  fs.writeFileSync(path.join(root, relativePath), content);
}

function replaceExact(relativePath, from, to, expected = 1) {
  const original = read(relativePath);
  const count = original.split(from).length - 1;
  if (count !== expected) {
    throw new Error(`${relativePath}: expected ${expected} occurrence(s), found ${count}.`);
  }
  write(relativePath, original.replaceAll(from, to));
}

const compatibility = 'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md';
replaceExact(
  compatibility,
  '> **Use:** During your turn, you may discard this card to gain one additional Action that turn.\n\nThe additional Action does not permit two Actions in one phase.',
  '> **Use:** During Opening or Denouement, you may discard this card. If you do, you may take one additional Action during that phase.'
);
replaceExact(
  compatibility,
  '> Draw three cards, then gain one additional Action that turn.\n\nThe additional Action does not permit two Actions in one phase.',
  '> Draw three cards. After this Action resolves, you may take one additional Action during this phase.'
);
replaceExact(
  compatibility,
  '> After you win a Counterattack, draw one card, then gain one additional Action that turn.\n\nThe additional Action does not permit two Actions in one phase.',
  '> After you win a Counterattack, draw one card. During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.'
);

const candidate = 'docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md';
replaceExact(
  candidate,
  '- Tariffs, Divestment, and Margin Loan grant an additional Action but do not create an immediate Action Opportunity. Resolve the card fully; the additional Action may be taken during a legal remaining Action phase, subject to the one-Action-per-phase limit.\n- If one of those cards is played during Denouement after an Action was already taken during Opening, the additional Action cannot be used that turn unless the card expressly permits two Actions during Denouement. The inherited v0.6.1 wording does not grant that permission.',
  '- Tariffs, Divestment, and Margin Loan each permit one additional Action during the phase in which the card\'s Action resolves. This explicit card permission overrides the normal one-Action-per-phase limit.\n- Resolve the card fully before taking the additional Action. The permission expires when that phase ends.'
);

const canonicalBuilder = 'v0.6.2/data/canonical-data.js';
replaceExact(
  canonicalBuilder,
  '  for (const name of ["Tariffs", "Divestment", "Margin Loan"]) {\n    replaceCardText(card(data, name), "gain 1 Action and immediately take another Action Opportunity", "gain one additional Action that turn");\n  }',
  '  setEffect(card(data, "Tariffs"), "Action", "Bank this card. Draw two cards. After this Action resolves, you may take one additional Action during this phase.");\n  setEffect(card(data, "Divestment"), "Action", "Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so. After this Action resolves, you may take one additional Action during this phase.");\n  setEffect(card(data, "Margin Loan"), "Action", "Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card\'s value plus 2. After this Action resolves, you may take one additional Action during this phase.");'
);
replaceExact(
  canonicalBuilder,
  '  setEffect(card(data, "Reinforcements"), "Use", "During your turn, you may discard this card to gain one additional Action that turn.");\n  appendRule(card(data, "Reinforcements"), "The additional Action does not permit two Actions in one phase.");',
  '  setEffect(card(data, "Reinforcements"), "Use", "During Opening or Denouement, you may discard this card. If you do, you may take one additional Action during that phase.");'
);
replaceExact(
  canonicalBuilder,
  '  replaceCardText(card(data, "Insurrection"), "gain 1 Action and immediately take another Action Opportunity", "gain one additional Action that turn");\n  replaceCardText(card(data, "Liberation"), "gain 1 Action and immediately take another Action Opportunity", "gain one additional Action that turn");',
  '  setEffect(card(data, "Insurrection"), "Action", "Discard your Hand. Each player shuffles their Discard Pile into their Draw Pile. Draw three cards. After this Action resolves, you may take one additional Action during this phase.");\n  setEffect(card(data, "Liberation"), "Asset", "After you win a Counterattack, draw one card. During your Denouement that turn, you may take one additional Action, even if you take another Action during that phase.");'
);

const matrix = 'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Test_Matrix.md';
let matrixText = read(matrix);
matrixText = matrixText.replaceAll(
  'The additional Action does not permit two Actions in one phase.',
  'The effect expressly permits the additional Action during the named phase, even when another Action is taken there.'
);
write(matrix, matrixText);

console.log('Applied the v0.6.2 additional-Action wording correction.');
