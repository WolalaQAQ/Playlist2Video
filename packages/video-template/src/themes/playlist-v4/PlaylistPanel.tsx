import React from 'react';
import type {TimelineTrack} from '@playlist2video/shared';

const fmt = (seconds: number) => `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;

export const PlaylistPanel: React.FC<{timeline: TimelineTrack[]; currentTrackId: string | null; totalDurationSeconds: number}> = ({timeline, currentTrackId, totalDurationSeconds}) => (
  <aside className="p2v-playlist-panel">
    <div className="p2v-playlist-header">
      <div><strong>FULL PLAYLIST</strong><span>Total {fmt(totalDurationSeconds)}</span></div>
      <em>{timeline.length} tracks</em>
    </div>
    <div className="p2v-playlist-items">
      {timeline.map((track, index) => (
        <div className={track.id === currentTrackId ? 'p2v-playlist-item active' : 'p2v-playlist-item'} key={track.id}>
          <span>{String(index + 1).padStart(2, '0')}</span>
          <b>{track.title} — {track.artist}</b>
          <i>{fmt(track.durationSeconds)}</i>
        </div>
      ))}
    </div>
  </aside>
);
