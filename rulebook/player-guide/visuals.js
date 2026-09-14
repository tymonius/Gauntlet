const CONTENT_SELECTOR = '[data-player-guide-content], [data-review-content]';
const VISUAL_SELECTOR = '[data-player-guide-visual]';

function territoryCells(controllers, yourToken = null, opponentToken = null) {
  return controllers.map((controller, index) => {
    const position = index + 1;
    const controllerLabel = controller === 'you' ? 'You control' : 'Opponent controls';
    const tokens = [
      yourToken === position ? '<span class="pg-token pg-token-you">You</span>' : '',
      opponentToken === position ? '<span class="pg-token pg-token-opponent">Opponent</span>' : '',
    ].join('');

    return `
      <span class="pg-territory pg-territory-${controller}" data-controller="${controller}">
        <span class="pg-territory-facing">${controller === 'you' ? 'faces you' : 'faces opponent'}</span>
        <span class="pg-territory-number">${position}</span>
        <span class="pg-territory-owner">${controllerLabel}</span>
        ${tokens}
      </span>`;
  }).join('');
}

function boardMarkup({
  controllers = ['you', 'you', 'you', 'opponent', 'opponent', 'opponent'],
  yourToken = 1,
  opponentToken = 6,
  label = 'Six Territory Gauntlet',
} = {}) {
  return `
    <div class="pg-board" role="img" aria-label="${label}">
      <div class="pg-direction pg-direction-you"><span>Your end</span><strong>Forward →</strong></div>
      <div class="pg-direction pg-direction-opponent"><strong>← Forward</strong><span>Opponent end</span></div>
      <div class="pg-territory-row">${territoryCells(controllers, yourToken, opponentToken)}</div>
    </div>`;
}

function visualFrame(kicker, title, body, caption, extraClass = '') {
  const figure = document.createElement('figure');
  figure.className = `pg-visual ${extraClass}`.trim();
  figure.dataset.playerGuideVisual = '';
  figure.innerHTML = `
    <header class="pg-visual-header">
      <span class="pg-visual-kicker">${kicker}</span>
      <strong>${title}</strong>
    </header>
    ${body}
    ${caption ? `<figcaption>${caption}</figcaption>` : ''}`;
  return figure;
}

function insertAfter(heading, node) {
  if (!heading || !node) return;
  heading.insertAdjacentElement('afterend', node);
}

function insertBefore(heading, node) {
  if (!heading || !node) return;
  heading.insertAdjacentElement('beforebegin', node);
}

function miniOverview() {
  const body = `
    <div class="pg-mini-overview">
      <span class="pg-mini-player">You</span>
      <span class="pg-mini-arrow" aria-hidden="true">→</span>
      <div class="pg-mini-territories" role="img" aria-label="Six Territories arranged in one line">
        ${Array.from({ length: 6 }, (_, index) => `<span>${index + 1}</span>`).join('')}
      </div>
      <span class="pg-mini-arrow" aria-hidden="true">←</span>
      <span class="pg-mini-player">Opponent</span>
    </div>
    <div class="pg-mini-principles" aria-label="Core game rhythm">
      <span>Move forward</span><span>Win battles</span><span>Hold ground</span><span>Capture</span>
    </div>`;
  return visualFrame('Orientation', 'One battlefield. Two directions.', body,
    'Both players move along the same six-Territory Gauntlet toward the other end.', 'pg-visual-mini');
}

function battlefieldVisual() {
  const body = `
    ${boardMarkup({ label: 'Starting Gauntlet: you control Territories 1 through 3 and stand on Territory 1; your opponent controls Territories 4 through 6 and stands on Territory 6.' })}
    <div class="pg-contrast-grid">
      <div><span class="pg-icon pg-icon-token" aria-hidden="true"></span><strong>Position</strong><p>Your token shows where you are.</p></div>
      <div><span class="pg-icon pg-icon-territory" aria-hidden="true"></span><strong>Control</strong><p>The Territory's facing and control label show who controls it.</p></div>
    </div>
    <div class="pg-victory-routes" aria-label="Two shared victory routes">
      <div><span>Route 1</span><strong>Control all six</strong><p>Advance your Front Line across the battlefield.</p></div>
      <div><span>Route 2</span><strong>Win a Last Stand</strong><p>Push the opponent beyond their end, then defeat them there.</p></div>
    </div>`;
  return visualFrame('Battlefield model', 'Position and control are different things', body,
    'Tokens can move back and forth without immediately changing who controls the Territory beneath them.', 'pg-visual-battlefield');
}

function setupVisual() {
  const steps = [
    ['1', 'Prepare faction', 'Leader, trackers, references, and faction components.'],
    ['2', 'Opening Hand', 'Draw 4, discard 1 face up, keep 3.'],
    ['3', 'Arrange Territories', 'Secretly order your 3 different Territories.'],
    ['4', 'Build the Gauntlet', 'Join both three-Territory lines and reveal all 6.'],
    ['5', 'Starting positions', 'Place each token on the Territory at its own end.'],
    ['6', 'First player', 'Roll one die each; higher roll starts. Reroll ties.'],
  ];
  const body = `
    <div class="pg-step-strip pg-setup-strip">
      ${steps.map(([number, title, copy]) => `
        <div class="pg-step-card"><span>${number}</span><strong>${title}</strong><p>${copy}</p></div>`).join('')}
    </div>
    <div class="pg-note pg-note-table"><strong>At the table</strong><span>Starting token placement is not movement and does not count as entering a Territory.</span></div>`;
  return visualFrame('Setup', 'From components to first turn', body, '', 'pg-visual-setup');
}

function turnVisual() {
  const steps = [
    ['Capture', 'Take eligible ground'],
    ['Draw', 'Draw 1'],
    ['Opening', 'Action may happen here'],
    ['Movement', 'Advance, Hold, or Fall Back'],
    ['Denouement', 'Action may happen here'],
    ['Cleanup', 'End effects; Hand to 3'],
  ];
  const body = `
    <div class="pg-turn-flow" aria-label="Turn sequence: Capture, Draw, Opening, Movement, Denouement, Cleanup">
      ${steps.map(([title, copy], index) => `
        <div class="pg-turn-step"><span>${index + 1}</span><strong>${title}</strong><small>${copy}</small></div>`).join('<span class="pg-flow-arrow" aria-hidden="true">→</span>')}
    </div>
    <div class="pg-action-choice">
      <span><strong>Opening</strong><small>Act before moving</small></span>
      <b>ONE NORMAL ACTION</b>
      <span><strong>Denouement</strong><small>Act after moving</small></span>
    </div>
    <p class="pg-visual-emphasis">Choose one side of Movement for your normal Action: <strong>act, then move</strong> — or <strong>move, then act</strong>.</p>`;
  return visualFrame('Turn flow', 'Six phases, one normal Action', body,
    'Specific effects can add Actions or alter timing, but this is the normal turn structure.', 'pg-visual-turn');
}

function movementVisual() {
  const body = `
    <div class="pg-movement-options">
      <div><span aria-hidden="true">→</span><strong>Advance</strong><p>Move one position toward the opponent's end.</p></div>
      <div><span aria-hidden="true">•</span><strong>Hold</strong><p>Remain in your current position.</p></div>
      <div><span aria-hidden="true">←</span><strong>Fall Back</strong><p>Move one position toward your own end.</p></div>
    </div>
    <div class="pg-contact-sequence" aria-label="Movement into the opponent's position starts a battle">
      <div><span class="pg-simple-token">You</span><span class="pg-space"></span><span class="pg-simple-token pg-simple-token-opponent">Opponent</span><small>Before</small></div>
      <span class="pg-flow-arrow" aria-hidden="true">→</span>
      <div><span class="pg-simple-token">You</span><span class="pg-collision">Battle</span><span class="pg-simple-token pg-simple-token-opponent">Opponent</span><small>Enter opponent's position</small></div>
    </div>
    <div class="pg-note"><strong>Movement sequence ends</strong><span>Unused movement from the sequence that started the battle is lost. Moving again requires a new legal movement sequence.</span></div>`;
  return visualFrame('Movement', 'Three choices — and one hard stop', body, '', 'pg-visual-movement');
}

function battleVisual() {
  const steps = [
    ['1', 'Onset', 'Does the battle proceed?'],
    ['2', 'Set Gambits', '<b>Attacker → Defender</b><small>from Hand</small>'],
    ['3', 'Form Reserves', 'Draw 3 temporary cards'],
    ['4', 'Reveal Gambits', 'Resolve Gambit effects'],
    ['5', 'Choose Tactics', '<b>Attacker → Defender</b><small>from Reserve</small>'],
    ['6', 'Reveal Tactics', 'Resolve Tactic effects'],
    ['7', 'Roll + compare', 'Determine battle totals'],
    ['8', 'Result', 'Winner, retreat, position'],
    ['9', 'Aftermath + clear', 'Resolve aftermath; clear battle cards'],
  ];
  const body = `
    <div class="pg-battle-flow" aria-label="Nine-step battle sequence">
      ${steps.map(([number, title, copy]) => `
        <div class="pg-battle-step${number === '2' || number === '5' ? ' pg-battle-commit' : ''}">
          <span>${number}</span><strong>${title}</strong><p>${copy}</p>
        </div>`).join('')}
    </div>
    <div class="pg-battle-key">
      <div><strong>Gambit</strong><span>Optional card from <b>Hand</b></span><small>Normally goes to Graveyard</small></div>
      <div><strong>Reserve</strong><span>3 temporary battle cards</span><small>Not part of Hand</small></div>
      <div><strong>Tactic</strong><span>Optional card from <b>Reserve</b></span><small>Normally goes to Discard</small></div>
    </div>
    <div class="pg-note pg-note-commit"><strong>Commitment order matters</strong><span>For both Gambits and Tactics, the attacker commits or passes first. The defender then commits or passes after seeing whether the attacker committed.</span></div>`;
  return visualFrame('Battle sequence', 'The fight in one view', body,
    'Effects can modify individual steps, but the normal battle follows this order.', 'pg-visual-battle');
}

function groundVisual() {
  const initial = ['you', 'you', 'you', 'opponent', 'opponent', 'opponent'];
  const captured = ['you', 'you', 'you', 'you', 'opponent', 'opponent'];
  const body = `
    <div class="pg-ground-sequence">
      <section><span class="pg-sequence-number">1</span><strong>Win the position</strong>${boardMarkup({ controllers: initial, yourToken: 4, opponentToken: 5, label: 'After you win on the first opposing Territory, your token stands on Territory 4 and the opponent has retreated to Territory 5. Territory 4 is still opponent-controlled.' })}<p>You advance onto enemy ground and win the battle.</p></section>
      <section><span class="pg-sequence-number">2</span><strong>Occupy</strong>${boardMarkup({ controllers: initial, yourToken: 4, opponentToken: 5, label: 'You occupy Territory 4 while the opponent still controls it.' })}<p>Your token is there, but the Territory still belongs to the opponent.</p></section>
      <section><span class="pg-sequence-number">3</span><strong>Hold it</strong>${boardMarkup({ controllers: initial, yourToken: 4, opponentToken: 5, label: 'You continue occupying Territory 4 while waiting for a later Capture step.' })}<p>The opponent has a chance to Counterattack before your next Capture step.</p></section>
      <section><span class="pg-sequence-number">4</span><strong>Capture</strong>${boardMarkup({ controllers: captured, yourToken: 4, opponentToken: 5, label: 'At an eligible Capture step, Territory 4 changes control to you and joins your Front Line.' })}<p>At an eligible later Capture step, the next Territory joins your Front Line.</p></section>
    </div>
    <div class="pg-note"><strong>One Territory at a time</strong><span>Normal Capture advances the Front Line by at most one Territory each turn, even if your token is farther ahead.</span></div>`;
  return visualFrame('Territorial progress', 'Position now. Control later.', body,
    'Winning on enemy ground creates Occupation; surviving there until an eligible Capture step turns that position into control.', 'pg-visual-ground');
}

function lastStandVisual() {
  const steps = [
    ['1', 'Fight on the end Territory', 'The defender is on the Territory at their own end.'],
    ['2', 'Defender loses', 'The defender retreats beyond the Gauntlet. The attacker remains on the final Territory.'],
    ['3', 'Previous movement is over', 'The movement sequence that started that battle ended when the battle began.'],
    ['4', 'Gain a new movement sequence', 'A later rule or effect must legally let the attacker Advance again.'],
    ['5', 'Advance beyond the end', 'Entering the defender’s beyond-the-end position starts the Last Stand.'],
    ['6', 'Resolve the Last Stand', 'Defender normally has Defensive Edge and separately +1 battle total. Attacker wins the game by winning this battle.'],
  ];
  const body = `
    <div class="pg-last-stand-flow">
      ${steps.map(([number, title, copy]) => `
        <div class="pg-last-stand-step"><span>${number}</span><strong>${title}</strong><p>${copy}</p></div>`).join('<span class="pg-flow-arrow" aria-hidden="true">→</span>')}
    </div>
    <div class="pg-note pg-note-warning"><strong>Not a carry-through move</strong><span>Unused movement from the battle-producing sequence cannot carry the attacker through the battle and beyond the end.</span></div>
    <div class="pg-note"><strong>Independent victory route</strong><span>You do not need to control or capture the opponent's final Territory before forcing a Last Stand.</span></div>`;
  return visualFrame('Last Stand', 'A second attack beyond the battlefield', body, '', 'pg-visual-last-stand');
}

function factionOverview() {
  const factions = [
    ['Military', 'Command → Orders', 'Shared victory only'],
    ['Diplomats', 'Influence → Proposals', 'Peace Treaty'],
    ['Financiers', 'Capital + Deeds', 'Controlling Interest'],
    ['Intelligence', 'Missions → Operation Progress + Intel', 'Special Operation'],
    ['Mystics', 'Rites → Ritual', 'Ritual of Ascension'],
    ['Inquisition', 'Conviction → Purges', 'Purification'],
  ];
  const body = `
    <div class="pg-faction-grid">
      ${factions.map(([name, system, victory]) => `
        <div class="pg-faction-card"><strong>${name}</strong><span>${system}</span><small>${victory}</small></div>`).join('')}
    </div>
    <p class="pg-visual-emphasis">Learn your own faction's operating rules. For the other five, this overview is opponent literacy—not another manual to memorize.</p>`;
  return visualFrame('Faction layer', 'Six ways to add pressure to the same shared game', body, '', 'pg-visual-factions');
}

function deckbuildingVisual() {
  const rules = [
    ['1 faction', 'Choose exactly one faction.'],
    ['1 Leader', 'Choose one Leader from that faction.'],
    ['30+ cards', 'At least 30 playable cards.'],
    ['≤ 60 value', 'Total printed card value may not exceed 60.'],
    ['Neutral + faction', 'Only Neutral cards and cards from your chosen faction.'],
    ['Unique = 1', 'A Unique card is limited to one copy.'],
    ['3 Territories', 'Choose exactly three different Territories.'],
    ['≤ 1 Arena', 'No more than one chosen Territory may be an Arena.'],
  ];
  const body = `
    <div class="pg-checklist-grid">
      ${rules.map(([rule, copy]) => `<div><span aria-hidden="true">✓</span><strong>${rule}</strong><p>${copy}</p></div>`).join('')}
    </div>
    <div class="pg-note"><strong>Separate components</strong><span>Your Leader and Territories are not part of the Deck and do not count toward the 30-card minimum or 60-value maximum.</span></div>`;
  return visualFrame('Deck construction', 'A legal game package at a glance', body, '', 'pg-visual-deckbuilding');
}

function escalationVisual() {
  const body = `
    <div class="pg-escalation-path" aria-label="Recommended learning and reference path">
      <div><span>1</span><strong>Player's Guide</strong><small>Learn the shared game</small></div>
      <span class="pg-flow-arrow" aria-hidden="true">→</span>
      <div><span>2</span><strong>Your Faction Guide</strong><small>Learn your extra layer</small></div>
      <span class="pg-flow-arrow" aria-hidden="true">→</span>
      <div><span>3</span><strong>Reference Cards</strong><small>Keep them at the table</small></div>
      <span class="pg-flow-arrow" aria-hidden="true">→</span>
      <div><span>4</span><strong>Rules Arbiter / Comprehensive Rules</strong><small>Consult when a question actually comes up</small></div>
    </div>`;
  return visualFrame('What next?', 'Learn less up front; consult more when needed', body,
    'The later references are tools to consult, not required reading before your first game.', 'pg-visual-escalation');
}

function removeVisuals(content) {
  content.querySelectorAll(VISUAL_SELECTOR).forEach((visual) => visual.remove());
}

function enhanceGuideVisuals() {
  const content = document.querySelector(CONTENT_SELECTOR);
  if (!content) return;

  removeVisuals(content);
  insertAfter(content.querySelector('#welcome-to-gauntlet'), miniOverview());
  insertAfter(content.querySelector('#the-gauntlet'), battlefieldVisual());
  insertAfter(content.querySelector('#3-setting-up'), setupVisual());
  insertAfter(content.querySelector('#4-your-turn'), turnVisual());
  insertAfter(content.querySelector('#5-movement'), movementVisual());
  insertBefore(content.querySelector('#1-onset'), battleVisual());
  insertAfter(content.querySelector('#7-taking-and-holding-ground'), groundVisual());
  insertAfter(content.querySelector('#route-2-force-your-opponent-to-make-a-last-stand'), lastStandVisual());
  insertAfter(content.querySelector('#9-the-six-factions'), factionOverview());
  insertAfter(content.querySelector('#10-building-a-deck'), deckbuildingVisual());
  insertAfter(content.querySelector('#where-to-go-from-here'), escalationVisual());
}

document.addEventListener('gauntlet:rulebook-rendered', (event) => {
  const surface = event.detail?.surface;
  if (surface && surface !== 'player-guide-review' && surface !== 'player-guide') return;
  enhanceGuideVisuals();
});

queueMicrotask(() => enhanceGuideVisuals());
