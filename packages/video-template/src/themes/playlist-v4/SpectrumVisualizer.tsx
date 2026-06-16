import React, {useMemo} from 'react';
import {spectrumFrameAt} from './spectrumEnergy';

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function sampleBand(frame: number[], index: number): number {
  if (frame.length === 0) return 0;
  if (frame.length === 1) return frame[0];

  const safeIndex = clamp(index, 0, frame.length - 1);
  const left = Math.floor(safeIndex);
  const right = Math.min(frame.length - 1, left + 1);
  const mix = safeIndex - left;
  return frame[left] * (1 - mix) + frame[right] * mix;
}

function fallbackSpectrumFrame(bands: number, progress: number, energy: number): number[] {
  const safeEnergy = clamp(energy);
  return Array.from({length: bands}, (_, index) => {
    const lowBias = 1 - index / Math.max(1, bands - 1);
    const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 18 - index * 0.52);
    return clamp((0.18 + lowBias * 0.34 + pulse * 0.42) * (0.55 + safeEnergy * 0.7));
  });
}

type Rgb = [number, number, number];

const spectrumPalette: Array<{position: number; color: Rgb}> = [
  {position: 0, color: [249, 115, 22]},
  {position: 0.28, color: [250, 204, 21]},
  {position: 0.58, color: [34, 211, 238]},
  {position: 0.78, color: [56, 189, 248]},
  {position: 1, color: [124, 58, 237]},
];

const toHex = (value: number) => Math.round(value).toString(16).padStart(2, '0');

function rgbToHex(color: Rgb): string {
  return `#${toHex(color[0])}${toHex(color[1])}${toHex(color[2])}`;
}

function rgbText(color: Rgb): string {
  return color.map((value) => Math.round(value)).join(', ');
}

function mixRgb(from: Rgb, to: Rgb, amount: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * amount,
    from[1] + (to[1] - from[1]) * amount,
    from[2] + (to[2] - from[2]) * amount,
  ];
}

function colorAt(position: number): Rgb {
  const safePosition = clamp(position);

  for (let index = 0; index < spectrumPalette.length - 1; index++) {
    const left = spectrumPalette[index];
    const right = spectrumPalette[index + 1];
    if (safePosition >= left.position && safePosition <= right.position) {
      return mixRgb(left.color, right.color, (safePosition - left.position) / (right.position - left.position));
    }
  }

  return spectrumPalette[spectrumPalette.length - 1].color;
}

function colorForBand(index: number, bands: number): {gradient: string; glow: string; cap: string} {
  const position = index / Math.max(1, bands - 1);
  const base = colorAt(position);
  const cap = rgbToHex(mixRgb(base, [255, 255, 255], 0.82));
  const upper = rgbToHex(mixRgb(base, [255, 255, 255], 0.36));
  const mid = rgbToHex(base);
  const lower = rgbToHex(mixRgb(base, [15, 23, 42], 0.28));
  return {
    cap,
    glow: rgbText(base),
    gradient: `linear-gradient(180deg,${cap},${upper} 26%,${mid} 62%,${lower})`,
  };
}

export const SpectrumVisualizer: React.FC<{spectrumFrames?: number[][]; progress: number; energy: number; bands?: number}> = ({
  spectrumFrames,
  progress,
  energy,
  bands = 32,
}) => {
  const sourceFrame = spectrumFrames?.length ? spectrumFrameAt(spectrumFrames, progress) : fallbackSpectrumFrame(48, progress, energy);
  const safeEnergy = clamp(energy);
  const renderedBands = Array.from({length: bands}, (_, index) => sampleBand(sourceFrame, (index / Math.max(1, bands - 1)) * Math.max(0, sourceFrame.length - 1)));
  const bandColors = useMemo(() => Array.from({length: bands}, (_, index) => colorForBand(index, bands)), [bands]);
  const frameMin = renderedBands.reduce((lowest, value) => Math.min(lowest, value), 1);
  const frameMax = renderedBands.reduce((highest, value) => Math.max(highest, value), 0);
  const frameSpan = Math.max(0, frameMax - frameMin);

  return (
    <div className="p2v-spectrum" style={{'--spectrum-energy': safeEnergy.toString()} as React.CSSProperties}>
      {renderedBands.map((band, index) => {
        const localContrast = frameSpan > 0.015 ? (clamp(band) - frameMin) / frameSpan : clamp(band);
        const shaped = Math.pow(clamp(localContrast * 0.74 + clamp(band) * 0.26), 0.48);
        const bassWeight = 1 - index / Math.max(1, bands - 1);
        const trebleSpark = Math.max(0, Math.sin(progress * Math.PI * 24 + index * 0.31));
        const transientLift = Math.max(0, localContrast - clamp(band)) * (18 + safeEnergy * 10);
        const height = clamp(10 + shaped * 86 + transientLift + safeEnergy * (bassWeight * 12 + trebleSpark * 9), 5, 100);
        const brightness = clamp(0.58 + shaped * 0.32 + safeEnergy * 0.16, 0.52, 1);
        const color = bandColors[index];
        return (
          <div
            className="p2v-spectrum-bar is-spectrum"
            key={index}
            style={
              {
                '--bar-brightness': brightness.toFixed(3),
                '--bar-cap': color.cap,
                '--bar-gradient': color.gradient,
                '--bar-glow': color.glow,
                height: `${height.toFixed(2)}%`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
};
