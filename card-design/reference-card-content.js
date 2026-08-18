// Bespoke player-aid copy. These records are authored for table lookup rather
// than generated from rulebook/faction-guide prose. The audit headings identify
// the canonical rules that must be rechecked whenever the corresponding guide
// changes; they are not used to generate visible card text.

export const BESPOKE_REFERENCE_CONTENT = Object.freeze({
  'diplomats-reference': {
    componentLabel: 'Diplomat',
    auditHeadings: [
      'Faction Actions',
      'Influence',
      'Offering Terms',
      'Diplomat mirrors',
      'Accepted Terms',
      'Refused Terms',
      'Leverage',
      'Treaty Articles and Peace Treaty',
    ],
    faces: {
      front: {
        title: 'Terms',
        sections: [
          {
            heading: 'Influence',
            blocks: [
              { type: 'rule', label: 'Start', text: '1 Influence' },
              { type: 'rule', label: 'Maximum', text: '10 Influence' },
              { type: 'rule', label: 'Stake', text: 'Lower available Influence by the Proposal’s Stake. Staked Influence is unavailable until Terms conclude.' },
            ],
          },
          {
            heading: 'Offer Terms',
            blocks: [
              {
                type: 'list',
                ordered: true,
                items: [
                  'During a pending battle, before Onset, choose one eligible Proposal.',
                  'Confirm its Requirement and enough available Influence for its Stake.',
                  'Lower available Influence by the Stake.',
                  'Opponent accepts or refuses.',
                ],
              },
              { type: 'paragraph', text: 'Normally, offer only one Proposal for a pending battle.' },
            ],
          },
          {
            heading: 'Accepted',
            blocks: [
              {
                type: 'list',
                ordered: true,
                items: [
                  'No battle begins. Resolve Accepted.',
                  'Return the Stake.',
                  'If unratified, flip to its Treaty Article side.',
                  'If newly ratified, gain 1 Influence.',
                  'Resolve effects that occur after acceptance.',
                ],
              },
              { type: 'paragraph', text: 'Unless the Proposal says otherwise: attacker withdraws; defender remains. No Onset, winner, loser, retreat, or Aftermath.' },
            ],
          },
          {
            heading: 'Refused',
            blocks: [
              {
                type: 'list',
                ordered: true,
                items: [
                  'Apply the Proposal’s Refused effect and refusal modifiers.',
                  'Continue to Gambits.',
                  'Before dice, you may use Leverage; then finish the battle through Aftermath.',
                ],
              },
            ],
          },
          {
            heading: 'Diplomat Mirror',
            blocks: [
              { type: 'paragraph', text: 'Attacker may offer first. If the attacker passes, defender may offer. Once either player offers Terms, the other cannot offer Terms for that battle.' },
            ],
          },
        ],
      },
      reverse: {
        title: 'Outcomes & Treaties',
        sections: [
          {
            heading: 'Refused Terms — Result',
            blocks: [
              {
                type: 'table',
                headers: ['Result', 'Stake', 'Proposal', 'Reward'],
                rows: [
                  ['Win', 'Return', 'If new: impose + flip', '+2 Influence*'],
                  ['Lose', 'Lose', 'No ratification', '—'],
                  ['No winner', 'Return', 'No ratification', '—'],
                ],
              },
              { type: 'paragraph', text: '* Newly ratified only, unless stated otherwise. Withdrawal creates no winner.' },
            ],
          },
          {
            heading: 'Leverage',
            blocks: [
              { type: 'paragraph', text: 'After refused Terms, before dice: spend available Influence for a battle-total bonus. Staked Influence cannot be spent.' },
              {
                type: 'table',
                headers: ['Bonus', '+1', '+2', '+3', '+4'],
                rows: [
                  ['Total cost', '1', '3', '6', '10'],
                ],
              },
              { type: 'paragraph', text: 'The progression continues: each additional +1 costs 1 more Influence than the previous increment.' },
            ],
          },
          {
            heading: 'Treaty Articles',
            blocks: [
              { type: 'paragraph', text: 'A ratified Proposal is a Treaty Article. It may be offered again, but cannot be ratified again and grants no normal newly-ratified Influence reward.' },
            ],
          },
          {
            heading: 'Peace Treaty',
            blocks: [
              { type: 'rule', label: 'Check', text: 'Start of your turn, after Capture and before Draw.' },
              { type: 'rule', label: 'Win', text: 'Five different Proposals are ratified.' },
            ],
          },
          {
            heading: 'Action Reminder',
            blocks: [
              { type: 'paragraph', text: 'Offering Terms and using Leverage do not take an Action.' },
            ],
          },
        ],
      },
    },
  },
});

export function bespokeReferenceContent(componentId) {
  return BESPOKE_REFERENCE_CONTENT[componentId] || null;
}
