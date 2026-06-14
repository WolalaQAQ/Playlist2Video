import React from 'react';

export const Waveform: React.FC<{energy: number}> = ({energy}) => (
  <div className="p2v-waveform">
    {Array.from({length: 96}, (_, index) => {
      const wave = Math.sin(index * 0.42 + energy * 8) * 0.5 + 0.5;
      return <div className="p2v-wave-bar" key={index} style={{height: `${Math.min(96, 18 + wave * 62 + energy * 20)}%`}} />;
    })}
  </div>
);
