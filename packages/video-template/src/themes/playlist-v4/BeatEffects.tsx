import React from 'react';
import type {ThemeConfig} from '@playlist2video/shared';

export const BeatEffects: React.FC<{energy: number; config: ThemeConfig}> = ({energy, config}) => {
  const opacity = config.effectIntensity === 'low' ? 0.25 : config.effectIntensity === 'medium' ? 0.45 : 0.7;
  return (
    <>
      {config.showPulseRings ? (
        <>
          <div className="p2v-ring p2v-ring-one" style={{opacity: opacity + energy * 0.2}} />
          <div className="p2v-ring p2v-ring-two" style={{opacity: opacity * 0.8 + energy * 0.2}} />
          <div className="p2v-ring p2v-ring-three" style={{opacity: opacity * 0.7 + energy * 0.2}} />
        </>
      ) : null}
      <div className="p2v-strobe" style={{opacity: opacity * 0.4 + energy * 0.4}} />
      <div className="p2v-flash" style={{opacity: opacity * 0.2 + energy * 0.35}} />
      {config.showParticles ? <div className="p2v-particles" /> : null}
    </>
  );
};
