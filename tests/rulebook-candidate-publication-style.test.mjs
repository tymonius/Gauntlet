import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path) => readFile(path, 'utf8');

describe('Browser Rulebook candidate publication styling', () => {
  it('loads the candidate-only publication reskin through the existing Rulebook asset layer', async () => {
    const leaderScript = await read('legacy/rulebook-browser/leader-portraits.js');
    const leaderStyles = await read('legacy/rulebook-browser/leader-portraits.css');

    expect(leaderScript).toContain("import './candidate-publication.js'");
    expect(leaderStyles).toContain('@import url("./candidate-publication.css")');
    expect(leaderScript).toContain("content.classList.contains('candidate-publication')");
  });

  it('restores publication hierarchy without changing released-v0.7.1 markup', async () => {
    const script = await read('legacy/rulebook-browser/candidate-publication.js');

    expect(script).toContain("if (mode !== 'candidate') return");
    expect(script).toContain("openingNote?.tagName === 'BLOCKQUOTE'");
    expect(script).toContain("masthead.className = 'candidate-masthead'");
    expect(script).toContain("content.classList.add('candidate-player-guide')");
    expect(script).toContain("content.classList.add('candidate-faction-guide')");
    expect(script).toContain("content.classList.add('candidate-complete-rules')");
    expect(script).toContain("wrapper.className = 'candidate-faction-overview'");
    expect(script).toContain("heading.classList.add('candidate-part-heading'");
    expect(script).toContain("gallery.classList.add('candidate-featured-leaders')");
  });

  it('uses the established heritage typography, rules, faction accents, and inset treatments', async () => {
    const styles = await read('legacy/rulebook-browser/candidate-publication.css');

    expect(styles).toContain('font-family: var(--rulebook-heritage)');
    expect(styles).toContain('border-top: 5px solid var(--candidate-accent');
    expect(styles).toContain('.candidate-faction-overview');
    expect(styles).toContain('.candidate-featured-leaders');
    expect(styles).toContain('.candidate-part-heading');
    expect(styles).toContain('.candidate-chapter-heading');
    expect(styles).toContain('.candidate-publication blockquote');
  });
});
