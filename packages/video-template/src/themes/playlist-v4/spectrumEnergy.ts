const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export interface SpectrumEnergyProfile {
  low: number;
  mid: number;
  high: number;
  overall: number;
  peak: number;
  frame: number[];
}

function shapeEnergy(value: number, peak: number): number {
  return clamp(Math.pow(clamp(value * 0.74 + peak * 0.26), 0.62));
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + clamp(value), 0) / values.length;
}

function maxValue(values: number[]): number {
  return values.reduce((highest, value) => Math.max(highest, clamp(value)), 0);
}

function sliceBand(frame: number[], startRatio: number, endRatio: number): number[] {
  if (frame.length === 0) return [];
  const start = Math.floor(frame.length * startRatio);
  const end = Math.max(start + 1, Math.ceil(frame.length * endRatio));
  return frame.slice(start, Math.min(frame.length, end));
}

export function spectrumFrameAt(spectrumFrames: number[][], progress: number): number[] {
  if (spectrumFrames.length === 0) return [];
  if (spectrumFrames.length === 1) return spectrumFrames[0].map((value) => clamp(value));

  const frameIndex = clamp(progress) * (spectrumFrames.length - 1);
  const left = Math.floor(frameIndex);
  const right = Math.min(spectrumFrames.length - 1, left + 1);
  const mix = frameIndex - left;
  const bandCount = Math.max(spectrumFrames[left]?.length ?? 0, spectrumFrames[right]?.length ?? 0);

  return Array.from({length: bandCount}, (_, bandIndex) => {
    const leftValue = spectrumFrames[left]?.[bandIndex] ?? 0;
    const rightValue = spectrumFrames[right]?.[bandIndex] ?? leftValue;
    return clamp(leftValue * (1 - mix) + rightValue * mix);
  });
}

function fallbackFrame(progress: number, bands = 48): number[] {
  return Array.from({length: bands}, (_, index) => {
    const position = index / Math.max(1, bands - 1);
    const lowBias = 1 - position;
    const midPulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 12 - index * 0.36);
    const highSpark = Math.max(0, Math.sin(progress * Math.PI * 34 + index * 0.73));
    return clamp(0.12 + lowBias * 0.24 + midPulse * 0.18 + highSpark * position * 0.22);
  });
}

export function getSpectrumEnergyProfile(options: {spectrumFrames?: number[][]; progress: number}): SpectrumEnergyProfile {
  const frame = options.spectrumFrames?.length ? spectrumFrameAt(options.spectrumFrames, options.progress) : fallbackFrame(options.progress);
  const lowFrame = sliceBand(frame, 0, 0.32);
  const midFrame = sliceBand(frame, 0.32, 0.68);
  const highFrame = sliceBand(frame, 0.68, 1);
  const lowPeak = maxValue(lowFrame);
  const midPeak = maxValue(midFrame);
  const highPeak = maxValue(highFrame);
  const peak = maxValue(frame);
  const overall = shapeEnergy(average(frame), peak);

  return {
    low: shapeEnergy(average(lowFrame), lowPeak),
    mid: shapeEnergy(average(midFrame), midPeak),
    high: shapeEnergy(average(highFrame), highPeak),
    overall,
    peak,
    frame,
  };
}
