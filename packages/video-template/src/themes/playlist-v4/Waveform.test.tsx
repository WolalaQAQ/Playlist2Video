// @vitest-environment jsdom
import React from 'react';
import {cleanup, render} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {SpectrumVisualizer} from './Waveform';

function renderedHeights(): number[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar')).map((bar) => Number.parseFloat(bar.style.height));
}

describe('SpectrumVisualizer', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders frequency spectrum bars instead of a centered played/unplayed waveform split', () => {
    render(<SpectrumVisualizer spectrumFrames={[[1, 0.8, 0.4, 0.2, 0.1, 0.05, 0.03, 0.02]]} progress={0} energy={0.6} bands={8} />);

    const bars = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar'));
    expect(bars).toHaveLength(8);
    expect(bars.every((bar) => bar.classList.contains('is-spectrum'))).toBe(true);
    expect(bars.some((bar) => bar.classList.contains('is-played'))).toBe(false);
    expect(bars.some((bar) => bar.classList.contains('is-playhead'))).toBe(false);
  });

  it('assigns smoothly interpolated theme-compatible colors from low to high frequencies', () => {
    render(<SpectrumVisualizer spectrumFrames={[[1, 0.8, 0.5, 0.3, 0.3, 0.5, 0.8, 1]]} progress={0} energy={0.6} bands={8} />);

    const bars = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar'));
    const gradients = bars.map((bar) => bar.style.getPropertyValue('--bar-gradient'));
    const glows = bars.map((bar) => bar.style.getPropertyValue('--bar-glow'));

    expect(new Set(gradients).size).toBe(8);
    expect(gradients[0]).toContain('#f97316');
    expect(gradients[3]).not.toBe(gradients[2]);
    expect(gradients[3]).not.toBe(gradients[4]);
    expect(gradients[3]).not.toContain('#facc15 62%,#fb923c');
    expect(gradients[7]).toContain('#7c3aed');
    expect(gradients[7]).not.toContain('#38bdf8');
    expect(new Set(glows).size).toBe(8);
  });

  it('maps low-to-high frequencies from left to right', () => {
    render(
      <SpectrumVisualizer
        spectrumFrames={[[1, 0.8, 0.5, 0.2, 0.08, 0.03, 0.02, 0.01]]}
        progress={0}
        energy={0.5}
        bands={8}
      />,
    );

    const heights = renderedHeights();
    expect(heights[0]).toBeGreaterThan(heights[7] + 40);
  });

  it('changes bands when playback reaches a different spectrum frame', () => {
    const spectrumFrames = [
      [1, 0.85, 0.3, 0.12, 0.05, 0.02, 0.01, 0.01],
      [0.01, 0.02, 0.05, 0.12, 0.3, 0.65, 0.9, 1],
    ];

    const {rerender} = render(<SpectrumVisualizer spectrumFrames={spectrumFrames} progress={0} energy={0.5} bands={8} />);
    const initial = renderedHeights();

    rerender(<SpectrumVisualizer spectrumFrames={spectrumFrames} progress={1} energy={0.5} bands={8} />);
    const later = renderedHeights();

    expect(initial[0]).toBeGreaterThan(initial[7] + 40);
    expect(later[7]).toBeGreaterThan(later[0] + 40);
  });

  it('expands subtle band differences into visible bar movement', () => {
    render(<SpectrumVisualizer spectrumFrames={[[0.18, 0.22, 0.2, 0.24, 0.19, 0.23, 0.21, 0.25]]} progress={0} energy={0.4} bands={8} />);

    const heights = renderedHeights();
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(28);
  });
});
