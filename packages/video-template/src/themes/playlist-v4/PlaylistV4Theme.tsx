import React, {useMemo} from 'react';
import {Audio, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {buildTimeline, findTrackAtTime, getTotalDuration} from '@playlist2video/shared';
import type {PlaylistVideoProps} from '../../PlaylistVideo';
import {BeatEffects} from './BeatEffects';
import {PlaylistPanel} from './PlaylistPanel';
import {SpectrumVisualizer} from './SpectrumVisualizer';
import {getSpectrumEnergyProfile} from './spectrumEnergy';
import {getTrackTitleFontSize} from './titleSizing';
import './theme.css';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
const fmtCount = (value: number) => String(value).padStart(2, '0');
type SequenceWithPremountProps = React.ComponentProps<typeof Sequence> & {premountFor?: number};

export const PlaylistV4Theme: React.FC<PlaylistVideoProps> = ({project, renderMode = 'video', stillTrackId}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const isStaticImage = renderMode === 'static-image';
  const timeline = useMemo(() => buildTimeline(project.tracks), [project.tracks]);
  const stillTrack = isStaticImage && stillTrackId ? timeline.find((track) => track.id === stillTrackId) : null;
  const currentTime = stillTrack ? stillTrack.startSeconds : frame / fps;
  const currentTrack = stillTrack ?? findTrackAtTime(timeline, currentTime);
  const totalDurationSeconds = useMemo(() => getTotalDuration(timeline), [timeline]);
  const index = currentTrack ? timeline.findIndex((track) => track.id === currentTrack.id) : 0;
  const localTime = currentTrack ? currentTime - currentTrack.startSeconds : 0;
  const progress = currentTrack ? Math.max(0, Math.min(1, localTime / currentTrack.durationSeconds)) : 0;
  const spectrumFps = Math.max(1, Math.min(project.exportConfig.fps, project.exportConfig.spectrumFps));
  const quantizedLocalTime = Math.floor(localTime * spectrumFps) / spectrumFps;
  const spectrumProgress = currentTrack ? Math.max(0, Math.min(1, quantizedLocalTime / currentTrack.durationSeconds)) : 0;
  const renderQuality = project.exportConfig.renderQuality;
  const energyProfile = getSpectrumEnergyProfile({spectrumFrames: currentTrack?.spectrumFrames, progress: spectrumProgress});
  const audioTracks = useMemo(() => timeline.filter((track) => track.audioPreviewUrl), [timeline]);
  const AudioSequence = Sequence as React.ComponentType<SequenceWithPremountProps>;

  if (!currentTrack) return <div className="p2v-root p2v-empty">No tracks loaded</div>;

  const coverSrc = currentTrack.coverPreviewUrl ?? (currentTrack.renderCoverPath ? staticFile(currentTrack.renderCoverPath) : null);

  return (
    <div
      className={`p2v-root p2v-quality-${renderQuality}`}
      style={
        {
          '--effect-energy': energyProfile.overall.toFixed(3),
          '--high-energy': energyProfile.high.toFixed(3),
          '--low-energy': energyProfile.low.toFixed(3),
          '--mid-energy': energyProfile.mid.toFixed(3),
          '--peak-energy': energyProfile.peak.toFixed(3),
        } as React.CSSProperties
      }
    >
      {!isStaticImage
        ? audioTracks.map((track) => (
            <AudioSequence
              key={track.id}
              from={Math.round(track.startSeconds * fps)}
              durationInFrames={Math.max(1, Math.round(track.endSeconds * fps) - Math.round(track.startSeconds * fps))}
              layout="none"
              premountFor={fps}
            >
              <Audio src={track.audioPreviewUrl!} />
            </AudioSequence>
          ))
        : null}
      <div className="p2v-bg" />
      <BeatEffects energyProfile={energyProfile} config={project.theme} renderQuality={renderQuality} />
      <main className="p2v-layout">
        <section className="p2v-now">
          <div className="p2v-cover-wrap">
            <div className="p2v-cover-glow" style={{transform: `scale(${1 + energyProfile.low * 0.11 + energyProfile.peak * 0.025})`}} />
            {coverSrc ? <Img className="p2v-cover" src={coverSrc} /> : <div className="p2v-cover" />}
          </div>
          <div className="p2v-copy">
            <div className="p2v-kicker">NOW PLAYING · {fmtCount(index + 1)}/{fmtCount(timeline.length)}</div>
            <h1 style={{fontSize: getTrackTitleFontSize(currentTrack.title)}}>{currentTrack.title}</h1>
            <p>{currentTrack.artist}{currentTrack.album ? ` — ${currentTrack.album}` : ''}</p>
            {!isStaticImage ? (
              <div className="p2v-progress">
                <div className="p2v-time-row"><span>{fmt(localTime)}</span><span>{fmt(currentTrack.durationSeconds)}</span></div>
                <div className="p2v-progress-track"><div style={{width: `${Math.max(0, Math.min(100, progress * 100))}%`}} /></div>
              </div>
            ) : null}
          </div>
        </section>
        <PlaylistPanel timeline={timeline} currentTrackId={currentTrack.id} totalDurationSeconds={totalDurationSeconds} />
      </main>
      {!isStaticImage ? <SpectrumVisualizer spectrumFrames={currentTrack.spectrumFrames} progress={spectrumProgress} energy={energyProfile.overall} /> : null}
    </div>
  );
};
