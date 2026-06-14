import React from 'react';

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function samplePeak(peaks: number[], index: number): number {
  if (peaks.length === 0) return 0;
  const safeIndex = clamp(index, 0, peaks.length - 1);
  const left = Math.floor(safeIndex);
  const right = Math.min(peaks.length - 1, left + 1);
  const mix = safeIndex - left;
  return peaks[left] * (1 - mix) + peaks[right] * mix;
}

export const Waveform: React.FC<{peaks?: number[]; progress: number; energy: number; bars?: number}> = ({peaks, progress, energy, bars = 96}) => {
  const source = peaks?.length ? peaks : Array.from({length: bars}, () => 0);
  const safeProgress = clamp(progress);
  const playheadBar = Math.floor(bars / 2);
  const playheadPeakIndex = safeProgress * Math.max(0, source.length - 1);
  const visibleHalfSpan = Math.max(4, source.length * 0.18);

  return (
    <div className="p2v-waveform" style={{'--wave-energy': clamp(energy).toString()} as React.CSSProperties}>
      {Array.from({length: bars}, (_, index) => {
        const sourceIndex = playheadPeakIndex + ((index - playheadBar) / playheadBar) * visibleHalfSpan;
        const peak = samplePeak(source, sourceIndex);
        const distanceFromPlayhead = Math.abs(index - playheadBar) / playheadBar;
        const focusBoost = (1 - clamp(distanceFromPlayhead)) * clamp(energy) * 0.22;
        const height = Math.max(5, Math.min(100, peak * 92 + 6 + focusBoost * 100));
        const classes = ['p2v-wave-bar'];
        if (sourceIndex >= 0 && sourceIndex < playheadPeakIndex) classes.push('is-played');
        if (index === playheadBar) classes.push('is-playhead');
        return <div className={classes.join(' ')} key={index} style={{height: `${height.toFixed(2)}%`}} />;
      })}
    </div>
  );
};
