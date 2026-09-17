import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('v0.7.2 Browser Rulebook v0.7.1 publication parity', () => {
  it('keeps browser controls while reusing the approved publication language', async () => {
    const boundary = JSON.parse(await readFile('config/publication-boundary.json', 'utf8'));
    const index = await readFile('legacy/rulebook-browser/index.html', 'utf8');
    const publication = await readFile('legacy/rulebook-browser/publication.css', 'utf8');
    const candidateCss = await readFile('legacy/rulebook-browser/candidate-publication.css', 'utf8');
    const candidateJs = await readFile('legacy/rulebook-browser/candidate-publication.js', 'utf8');
    const leadersCss = await readFile('legacy/rulebook-browser/leader-portraits.css', 'utf8');
    const leadersJs = await readFile('legacy/rulebook-browser/leader-portraits.js', 'utf8');

    const rulebookRoute = boundary.materializedRoutes.find(route => route.publicPath === '/rulebook/');
    expect(rulebookRoute?.source).toBe('legacy/rulebook-browser');

    // Web-native controls remain intact instead of pretending the browser is a
    // paginated PDF.
    expect(index).toContain('data-rulebook-search');
    expect(index).toContain('data-rulebook-toc');
    expect(index).toContain('data-candidate-document');
    expect(publication).toContain('--rulebook-paper: #fbf7ee');
    expect(publication).toContain('--rulebook-body: "adobe-caslon-pro"');
    expect(publication).toContain('--rulebook-heritage: "p22-1722-pro"');

    // Candidate mastheads carry the same faction identity used by the approved
    // print publication, including the final 9% watermark treatment.
    expect(candidateCss).toContain('.candidate-faction-masthead::after');
    expect(candidateCss).toContain('opacity: .09');
    expect(candidateCss).toContain('mask: var(--candidate-symbol)');
    expect(candidateCss).toContain('.candidate-masthead-claim');
    expect(candidateJs).toContain("claim: 'Command the advance.'");
    expect(candidateJs).toContain("claim: 'Transform the hidden world.'");
    expect(candidateJs).toContain("content.style.setProperty('--candidate-accent', faction.color)");

    // Faction-guide Leaders use the same composition decisions approved for
    // the modular booklets: visible-ink fitting, woodcut plate, identity column,
    // top-packed ability panel, then full-width commentary.
    expect(candidateCss).toContain('.candidate-leader-profile');
    expect(candidateCss).toContain('.candidate-leader-hero');
    expect(candidateCss).toContain('grid-template-columns: minmax(250px, 1.05fr) minmax(240px, .8fr)');
    expect(candidateCss).toContain('.candidate-leader-ability');
    expect(candidateCss).toContain('margin: 18px 0 0');
    expect(leadersJs).toContain('measureCandidateLeaderBounds');
    expect(leadersJs).toContain('paintCandidateLeaderArtwork');
    expect(leadersJs).toContain("profile.className = 'candidate-leader-profile'");
    expect(leadersJs).toContain("identity.className = 'candidate-leader-identity'");
    expect(leadersJs).toContain("figure.dataset.leaderArtworkFitted = 'true'");

    // Released v0.7.1 browser presentation stays available and unchanged in
    // principle; its established two-up gallery remains a separate path.
    expect(leadersCss).toContain('.leader-portrait-gallery');
    expect(leadersJs).toContain('injectReleasedLeaderPortraits');
    expect(leadersJs).toContain("if (mode !== 'candidate')");
  });
});
