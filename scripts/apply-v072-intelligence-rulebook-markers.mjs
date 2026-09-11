import fs from 'node:fs';

const path = 'rulebook/player-facing/current-rulebook.md';
let source = fs.readFileSync(path, 'utf8');

const replacements = [
  [
    '| Faction Features | Missions and Special Operations — 1 Action · Denouement; Operational Capacity — Automatic; Surveillance and Interference — No Action at their stated battle timings. |',
    '| Faction Features | Missions and Special Operations — 1 Action · Denouement; Operational Capacity — Automatic; Surveillance and Interference — No Action at their stated battle timings. |<!-- RULE-FACT:faction-features.intelligence.operational-capacity -->',
  ],
  [
    "A completed Mission gives 1 Operation Progress and Intel equal to the card's value. At the start of each of your turns, gain Intel equal to your current Operation Progress. When Operation Progress exceeds the number of Territories the opponent controls, you may begin a Special Operation.",
    "A completed Mission gives 1 Operation Progress and Intel equal to the card's value. At the start of each of your turns, gain Intel equal to your current Operation Progress. When Operation Progress exceeds the number of Territories the opponent controls, you may begin a Special Operation.<!-- RULE-FACT:intelligence.turn-start-intel -->",
  ],
  [
    'Intel begins at 0, cannot fall below 0, and has no maximum. At the start of your turn, gain Intel equal to your current Operation Progress. Spend Intel for Surveillance, Interference, Fieldcraft, Mission abortion, Special Operation completion, and card effects.',
    'Intel begins at 0, cannot fall below 0, and has no maximum. At the start of your turn, gain Intel equal to your current Operation Progress. Spend Intel for Surveillance, Interference, Fieldcraft, Mission abortion, Special Operation completion, and card effects.<!-- RULE-FACT:intelligence.turn-start-intel -->',
  ],
  [
    'Operation Progress begins at 0 and is not normally spent. Each completed normal Mission adds 1, regardless of card value. It records how many normal Missions you have completed. A newly gained point of Operation Progress begins contributing to your recurring Intel at the start of your next turn; it does not create another immediate Intel payment when the Mission completes.',
    'Operation Progress begins at 0 and is not normally spent. Each completed normal Mission adds 1, regardless of card value. It records how many normal Missions you have completed. A newly gained point of Operation Progress begins contributing to your recurring Intel at the start of your next turn; it does not create another immediate Intel payment when the Mission completes.<!-- RULE-FACT:intelligence.operation-progress -->',
  ],
  [
    '**Operational Capacity — Automatic.** If you used your normal Action during Opening, you may still spend 1 Action during Denouement to **Start or Complete a Mission or Special Operation**. You still cannot take more than one Action in either phase. **Abort Mission does not qualify.**',
    '**Operational Capacity — Automatic.** If you used your normal Action during Opening, you may still spend 1 Action during Denouement to **Start or Complete a Mission or Special Operation**. You still cannot take more than one Action in either phase. **Abort Mission does not qualify.**<!-- RULE-FACT:faction-features.intelligence.operational-capacity -->',
  ],
  [
    'Starting and completing Missions and Special Operations remain 1 Action Faction Features. Operational Capacity changes how that qualifying Denouement Action fits into the turn; it does not make those procedures No Action and cannot be converted into another ordinary Denouement Action.',
    'Starting and completing Missions and Special Operations remain 1 Action Faction Features. Operational Capacity changes how that qualifying Denouement Action fits into the turn; it does not make those procedures No Action and cannot be converted into another ordinary Denouement Action.<!-- RULE-FACT:faction-features.intelligence.operational-capacity -->',
  ],
];

for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`Expected one Rulebook marker target, found ${count}: ${before.slice(0, 80)}`);
  }
  source = source.replace(before, after);
}

fs.writeFileSync(path, source);
