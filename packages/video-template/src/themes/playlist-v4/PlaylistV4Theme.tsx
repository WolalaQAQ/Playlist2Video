import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {buildTimeline, findTrackAtTime, getTotalDuration} from '@playlist2video/shared';
import type {PlaylistVideoProps} from '../../PlaylistVideo';
import {BeatEffects} from './BeatEffects';
import {PlaylistPanel} from './PlaylistPanel';
import {Waveform} from './Waveform';
import './theme.css';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export const PlaylistV4Theme: React.FC<PlaylistVideoProps> = ({project}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentTime = frame / fps;
  const timeline = buildTimeline(project.tracks);
  const currentTrack = findTrackAtTime(timeline, currentTime);
  const totalDurationSeconds = getTotalDuration(timeline);
  const index = currentTrack ? timeline.findIndex((track) => track.id === currentTrack.id) : 0;
  const localTime = currentTrack ? currentTime - currentTrack.startSeconds : 0;
  const progress = currentTrack ? localTime / currentTrack.durationSeconds : 0;
  const energy = interpolate(Math.sin(frame / 5), [-1, 1], [0.15, 1]);

  if (!currentTrack) return <div className="p2v-root p2v-empty">No tracks loaded</div>;

  return (
    <div className="p2v-root">
      <div className="p2v-bg" />
      <BeatEffects energy={energy} config={project.theme} />
      <main className="p2v-layout">
        <section className="p2v-now">
          <div className="p2v-cover-wrap">
            <div className="p2v-cover-glow" style={{transform: `scale(${1 + energy * 0.06})`}} />
            {currentTrack.renderCoverPath ? <Img className="p2v-cover" src={staticFile(currentTrack.renderCoverPath)} /> : <div className="p2v-cover" />}
          </div>
          <div className="p2v-copy">
            <div className="p2v-kicker">NOW PLAYING · {String(index + 1).padStart(2, '0')} / {timeline.length}</div>
            <h1>{currentTrack.title}</h1>
            <p>{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</p>
            <div className="p2v-progress">
              <div className="p2v-time-row"><span>{fmt(localTime)}</span><span>{fmt(currentTrack.durationSeconds)}</span></div>
              <div className="p2v-progress-track"><div style={{width: `${Math.max(0, Math.min(100, progress * 100))}%`}} /></div>
            </div>
          </div>
        </section>
        <PlaylistPanel timeline={timeline} currentTrackId={currentTrack.id} totalDurationSeconds={totalDurationSeconds} />
      </main>
      <Waveform energy={energy} />
    </div>
  );
};
