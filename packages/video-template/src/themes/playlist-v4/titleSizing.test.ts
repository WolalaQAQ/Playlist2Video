import {describe, expect, it} from 'vitest';
import {getTrackTitleFontSize} from './titleSizing';

describe('getTrackTitleFontSize', () => {
  it('keeps short track titles at the default display size', () => {
    expect(getTrackTitleFontSize('First')).toBe(92);
  });

  it('reduces long track titles so they take less vertical space', () => {
    expect(getTrackTitleFontSize('This Is a Very Long Song Title That Should Not Dominate the Whole Video Canvas')).toBeLessThan(92);
  });

  it('allows very long titles to shrink to a smaller readable minimum size', () => {
    expect(getTrackTitleFontSize('A'.repeat(200))).toBe(30);
  });
});
