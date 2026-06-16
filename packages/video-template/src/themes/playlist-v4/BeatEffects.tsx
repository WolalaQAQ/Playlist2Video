import React from 'react';
import type {ExportConfig, ThemeConfig} from '@playlist2video/shared';
import type {SpectrumEnergyProfile} from './spectrumEnergy';

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const particlePositions = [
  [8, 18],
  [15, 72],
  [22, 32],
  [29, 84],
  [35, 13],
  [42, 67],
  [48, 23],
  [55, 78],
  [61, 36],
  [67, 16],
  [72, 57],
  [78, 28],
  [83, 73],
  [88, 42],
  [12, 52],
  [31, 48],
  [52, 10],
  [70, 88],
] as const;

export const BeatEffects: React.FC<{energyProfile: SpectrumEnergyProfile; config: ThemeConfig; renderQuality: ExportConfig['renderQuality']}> = ({energyProfile, config, renderQuality}) => {
  const minimal = config.effectIntensity === 'minimal' || renderQuality === 'minimal';
  const intensity = minimal ? 0.32 : config.effectIntensity === 'low' ? 0.55 : config.effectIntensity === 'medium' ? 0.8 : 1;
  const baseOpacity = minimal ? 0.08 : config.effectIntensity === 'low' ? 0.18 : config.effectIntensity === 'medium' ? 0.32 : 0.48;
  const low = clamp(energyProfile.low * intensity);
  const mid = clamp(energyProfile.mid * intensity);
  const high = clamp(energyProfile.high * intensity);
  const peak = clamp(energyProfile.peak * intensity);
  const overall = clamp(energyProfile.overall * intensity);
  return (
    <>
      {config.showPulseRings && !minimal ? (
        <>
          <div className="p2v-ring p2v-ring-one" style={{opacity: baseOpacity + low * 0.44, transform: `scale(${(1 + low * 0.18).toFixed(3)})`}} />
          <div className="p2v-ring p2v-ring-two" style={{opacity: baseOpacity * 0.8 + mid * 0.42, transform: `scale(${(1 + mid * 0.15).toFixed(3)})`}} />
          <div className="p2v-ring p2v-ring-three" style={{opacity: baseOpacity * 0.72 + high * 0.46, transform: `scale(${(1 + high * 0.14).toFixed(3)})`}} />
        </>
      ) : null}
      {!minimal ? <div className="p2v-strobe" style={{opacity: baseOpacity * 0.32 + mid * 0.42 + overall * 0.12}} /> : null}
      {!minimal ? <div className="p2v-flash" style={{opacity: baseOpacity * 0.16 + peak * 0.24 + high * 0.2}} /> : null}
      {config.showParticles && !minimal ? (
        <div className="p2v-particles" style={{opacity: 0.28 + high * 0.44 + peak * 0.16}}>
          {particlePositions.map(([left, top], index) => {
            const wave = 0.5 + 0.5 * Math.sin(index * 1.73 + high * Math.PI * 2);
            const size = 5 + ((index * 7) % 13) + high * 10 + peak * 5;
            const opacity = clamp(0.08 + high * 0.56 + peak * 0.2 + wave * 0.12);
            return (
              <span
                className="p2v-particle"
                key={`${left}-${top}`}
                style={{
                  left: `${left}%`,
                  opacity,
                  top: `${top}%`,
                  transform: `translate(-50%, -50%) scale(${(0.65 + high * 0.78 + wave * 0.24).toFixed(3)})`,
                  width: `${size.toFixed(2)}px`,
                }}
              />
            );
          })}
        </div>
      ) : null}
    </>
  );
};
