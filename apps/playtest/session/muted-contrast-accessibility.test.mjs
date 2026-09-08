import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const styles = readFileSync('playtest/session/styles.css', 'utf8');

function channel(value) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Expected six-digit hex color, received ${hex}`);
  const [r, g, b] = match.slice(1).map(part => channel(Number.parseInt(part, 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('formal playtest session muted text contrast', () => {
  it('keeps muted text readable over the darkest conservative layered-background sample', () => {
    const muted = styles.match(/--muted:\s*(#[0-9a-f]{6})/i)?.[1];
    expect(muted).toBe('#4f5956');

    // #dacabe conservatively combines the full 13% crimson radial tint with the
    // darkest endpoint of the page's parchment gradient. Real page locations are lighter.
    expect(contrast(muted, '#dacabe')).toBeGreaterThanOrEqual(4.5);
  });
});
