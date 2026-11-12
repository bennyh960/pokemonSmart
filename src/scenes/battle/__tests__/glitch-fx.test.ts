import { describe, expect, it } from 'vitest';
import { GLITCH_STYLE_ODDS, rollGlitchStyle } from '../glitch-fx.js';

describe('glitch style odds', () => {
  it('every infection level sums to 100%', () => {
    for (const odds of Object.values(GLITCH_STYLE_ODDS)) {
      const sum = Object.values(odds).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeCloseTo(1, 6);
    }
  });

  it('critical only rolls decompile or zombie', () => {
    for (let i = 0; i < 50; i++) expect(['code', 'zombie']).toContain(rollGlitchStyle('critical', () => i / 50));
  });

  it('a calm or unknown map falls back to low odds', () => {
    expect(rollGlitchStyle(undefined, () => 0)).toBe('static');
    expect(rollGlitchStyle('none', () => 0.6)).toBe('missingno');
  });
});
