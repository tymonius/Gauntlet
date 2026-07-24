import { describe, expect, test } from 'vitest';
import { renderMarkdown } from './markdown.js';

describe('browser rulebook Markdown renderer', () => {
  test('renders headings with stable unique anchors', () => {
    const rendered = renderMarkdown('# Rules\n\n## Battle\n\n## Battle');

    expect(rendered.html).toContain('<h1 id="rules">Rules</h1>');
    expect(rendered.html).toContain('<h2 id="battle">Battle</h2>');
    expect(rendered.html).toContain('<h2 id="battle-2">Battle</h2>');
    expect(rendered.headings).toEqual([
      { id: 'rules', level: 1, label: 'Rules' },
      { id: 'battle', level: 2, label: 'Battle' },
      { id: 'battle-2', level: 2, label: 'Battle' }
    ]);
  });

  test('renders rulebook tables and inline emphasis', () => {
    const rendered = renderMarkdown([
      '| Result | Reward |',
      '|---|---:|',
      '| **Win** | +1 |'
    ].join('\n'));

    expect(rendered.html).toContain('<table>');
    expect(rendered.html).toContain('<th scope="col">Result</th>');
    expect(rendered.html).toContain('<td><strong>Win</strong></td>');
    expect(rendered.html).toContain('<td>+1</td>');
  });

  test('rewrites canonical leader image paths for the browser page', () => {
    const rendered = renderMarkdown('![General](../../images/sketches/general.png)');

    expect(rendered.html).toContain('src="../images/sketches/general.png"');
    expect(rendered.html).toContain('alt="General"');
  });

  test('omits print-only page-break markers', () => {
    const rendered = renderMarkdown('Before\n\n<div class="page-break"></div>\n\nAfter');

    expect(rendered.html).toBe('<p>Before</p>\n<p>After</p>');
  });

  test('escapes raw HTML from prose while preserving supported Markdown', () => {
    const rendered = renderMarkdown('Use **specific rules** before <script>alert(1)</script>.');

    expect(rendered.html).toContain('<strong>specific rules</strong>');
    expect(rendered.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered.html).not.toContain('<script>');
  });
});
