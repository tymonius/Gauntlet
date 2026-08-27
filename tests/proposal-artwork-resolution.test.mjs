import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderer = readFileSync('card-design/proposal-card.js', 'utf8');
const approvedArtwork = [
  'capitulation',
  'de-escalation',
  'open-channels',
  'orderly-withdrawal',
];

describe('Diplomat Proposal artwork resolution', () => {
  it('uses the nested approved Proposal artwork directory', () => {
    expect(renderer).toContain("const PROPOSAL_ART_ROOT = '/images/artwork/cards/diplomats/proposals'");
    expect(renderer).toContain('`${PROPOSAL_ART_ROOT}/${proposal.id}.png`');
    for (const id of approvedArtwork) {
      expect(existsSync(`images/artwork/cards/diplomats/proposals/${id}.png`)).toBe(true);
    }
  });

  it('keeps missing Proposal art as an explicit pending frame', () => {
    expect(renderer).toContain('data-proposal-artwork');
    expect(renderer).toContain('Artwork pending');
    expect(renderer).toContain('await loadProposalArtwork(root)');
    expect(renderer).toContain("figure.classList.add('has-image')");
    expect(renderer).toContain("figure.classList.remove('proposal-art-pending')");
  });
});
