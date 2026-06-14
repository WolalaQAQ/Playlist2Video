import React from 'react';
import type {Project} from '@playlist2video/shared';

export const PlaylistEditor: React.FC<{
  project: Project;
  onReorder: (trackIds: string[]) => void;
  onUpdateTrack: (input: {trackId: string; title: string; artist: string}) => void;
}> = ({project, onReorder, onUpdateTrack}) => {
  const tracks = [...project.tracks].sort((a, b) => a.order - b.order);
  return (
    <section className="card playlist-editor">
      <div className="section-heading"><h2>Playlist</h2><span>{tracks.length} tracks</span></div>
      <div className="track-list">
        {tracks.map((track, index) => (
          <article className="track-row" key={track.id}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {track.coverPath ? <img src={`file://${track.coverPath}`} alt="" /> : <div className="cover-placeholder" />}
            <div>
              <input value={track.title} onChange={(event) => onUpdateTrack({trackId: track.id, title: event.target.value, artist: track.artist})} />
              <input value={track.artist} onChange={(event) => onUpdateTrack({trackId: track.id, title: track.title, artist: event.target.value})} />
            </div>
            <time>{Math.floor(track.durationSeconds / 60)}:{Math.floor(track.durationSeconds % 60).toString().padStart(2, '0')}</time>
          </article>
        ))}
      </div>
      <button onClick={() => onReorder(tracks.map((track) => track.id))}>Save current order</button>
    </section>
  );
};
