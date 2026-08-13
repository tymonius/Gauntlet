import fs from 'node:fs';

const buildPath = 'scripts/build-clean-v063-faction-authority.mjs';
const validatorPath = 'scripts/validate-clean-v063-faction-authority.mjs';

let build = fs.readFileSync(buildPath, 'utf8');
let validator = fs.readFileSync(validatorPath, 'utf8');

function replaceOnce(text, before, after, label) {
  if (text.includes(before)) return text.replace(before, after);
  if (text.includes(after)) return text;
  throw new Error(`Reviewed reconstruction substitution not found: ${label}`);
}

build = replaceOnce(
  build,
  "  return text\n    .replaceAll('Playable Deck', 'Deck')",
  `  if (faction.slug === 'diplomat') {
    const oldSanctions = "## Sanctions\\n\\n**Sanctions** is a shared title series, not a separate card type.\\n\\nEach Sanction identifies:\\n\\n- the opponent whose refusal allowed it to enter play; and\\n- its owner.\\n\\nIts ongoing effect and relief condition continue to refer to those identified players even if an Overlay changes control with its Territory.";
    const v063Sanctions = "## Sanctions\\n\\n**Sanctions** is a shared title series, not a separate card type. A card whose title begins **Sanctions:** is a **Sanction**.\\n\\nWhen a Sanction is played, placed, or banked because an opponent refused its owner's Terms:\\n\\n- that opponent remains associated with that Sanction for as long as it remains in play; and\\n- unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile.\\n\\nA Sanction may state additional removal conditions. Cards therefore do not need to repeat identification of the refusing opponent or the default expiration after later acceptance.";
    invariant(text.includes(oldSanctions), 'Diplomat: certified Sanctions section drifted');
    text = text.replace(oldSanctions, v063Sanctions);
  }

  return text
    .replaceAll('Playable Deck', 'Deck')`,
  'Diplomat Sanctions shared-rule integration'
);

build = replaceOnce(
  build,
  '    targeted_faction_card_review: targetedFactionCards,\n    guides: guideManifest,',
  `    targeted_faction_card_review: targetedFactionCards,
    approved_identity_transitions: [
      {
        card: 'Extraordinary Rendition',
        field: 'card_form',
        from: 'Asset with a bound opposing card',
        to: 'Asset',
        classification: 'convention-normalization',
        evidence: 'docs/v063-card-language-overrides/intelligence.json',
      },
    ],
    integrated_faction_shared_rules: ['diplomat-sanctions-default-expiration'],
    guides: guideManifest,`,
  'manifest identity/shared-rule audit record'
);

build = replaceOnce(
  build,
  'Faction-card identities, costs, traits, forms, unique status, and ordering are checked against the certified clean v0.6.2 guides. Exact v0.6.3 effect wording is imported from the pinned finalized canonical-data candidate strictly as a verified delta payload.',
  'Faction-card identities, costs, traits, unique status, and ordering are checked against the certified clean v0.6.2 guides. Card form is equality-locked except for the explicitly audited Extraordinary Rendition convention normalization from Asset with a bound opposing card to Asset. Exact v0.6.3 effect wording is imported from the pinned finalized canonical-data candidate strictly as a verified delta payload.',
  'faction README identity boundary wording'
);

build = replaceOnce(
  build,
  'The historical canonical-data candidate is evidence only; its card identities cannot override certified clean v0.6.2 identity fields, and its effect text becomes authority only through manual merge of this reconstruction PR.',
  'The historical canonical-data candidate is evidence only; it cannot override certified clean v0.6.2 identity fields except for the explicitly audited Extraordinary Rendition card-form convention normalization, and its effect text becomes authority only through manual merge of this reconstruction PR.',
  'source-boundary identity exception wording'
);

build = replaceOnce(
  build,
  'Retired v0.6.2 card-face conventions are rejected: Battle/Activate/Use effect headings, explicit inherent Bank Actions, and Playable Deck terminology.',
  'Retired v0.6.2 card-face conventions are rejected: Battle/Activate/Use effect headings, exact standalone inherent Bank Actions, and Playable Deck terminology. Special banking Actions that carry additional rules meaning remain printed.',
  'semantic-review inherent Bank wording'
);

validator = replaceOnce(
  validator,
  "if ((manifest.recovered_late_decisions ?? []).length !== 3) fail('authority manifest must retain the three recovered PR #571 decisions');",
  `if ((manifest.recovered_late_decisions ?? []).length !== 3) fail('authority manifest must retain the three recovered PR #571 decisions');
const identityTransitions = manifest.approved_identity_transitions ?? [];
if (identityTransitions.length !== 1 || identityTransitions[0]?.card !== 'Extraordinary Rendition' || identityTransitions[0]?.field !== 'card_form' || identityTransitions[0]?.from !== 'Asset with a bound opposing card' || identityTransitions[0]?.to !== 'Asset') fail('authority manifest must pin exactly the approved Extraordinary Rendition form normalization');
if (JSON.stringify(manifest.integrated_faction_shared_rules ?? []) !== JSON.stringify(['diplomat-sanctions-default-expiration'])) fail('authority manifest must record the Diplomat Sanctions shared-rule integration');
const diplomatGuide = outputs['artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md'];
for (const requiredSanctionsText of [
  'that opponent remains associated with that Sanction for as long as it remains in play',
  "unless the Sanction says otherwise, after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile",
  'A Sanction may state additional removal conditions',
]) {
  if (!diplomatGuide?.includes(requiredSanctionsText)) fail(\`Diplomat guide missing adopted Sanctions shared rule: \${requiredSanctionsText}\`);
}`,
  'validator Sanctions and identity-transition checks'
);

fs.writeFileSync(buildPath, build);
fs.writeFileSync(validatorPath, validator);
console.log('Integrated the approved Sanctions shared rule and explicit identity-transition audit into clean v0.6.3 faction reconstruction.');
