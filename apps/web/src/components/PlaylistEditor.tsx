import React, {useCallback, useEffect, useMemo, useState} from 'react';
import type {Project, Track} from '@playlist2video/shared';

function sortTracks(tracks: Track[]): Track[] {
  return [...tracks].sort((a, b) => a.order - b.order);
}

function moveTrack(tracks: Track[], draggedId: string, targetId: string): Track[] {
  if (draggedId === targetId) return tracks;
  const fromIndex = tracks.findIndex((track) => track.id === draggedId);
  const toIndex = tracks.findIndex((track) => track.id === targetId);
  if (fromIndex < 0 || toIndex < 0) return tracks;
  const nextTracks = [...tracks];
  const [draggedTrack] = nextTracks.splice(fromIndex, 1);
  nextTracks.splice(toIndex, 0, draggedTrack);
  return nextTracks;
}

function findTrackIdAtPoint(x: number, y: number): string | null {
  const elements = document.elementsFromPoint(x, y);
  const row = elements
    .map((element) => element.closest<HTMLElement>('[data-track-id]'))
    .find((element): element is HTMLElement => Boolean(element));
  return row?.dataset.trackId ?? null;
}

export const PlaylistEditor: React.FC<{
  project: Project;
  onReorder: (trackIds: string[]) => void | Promise<Project>;
  onUpdateTrack: (input: {trackId: string; title: string; artist: string}) => void;
}> = ({project, onReorder, onUpdateTrack}) => {
  const sortedProjectTracks = useMemo(() => sortTracks(project.tracks), [project.tracks]);
  const [tracks, setTracks] = useState<Track[]>(sortedProjectTracks);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [mouseDragTrackId, setMouseDragTrackId] = useState<string | null>(null);

  useEffect(() => {
    setTracks(sortedProjectTracks);
  }, [sortedProjectTracks]);

  const commitOrder = useCallback((nextTracks: Track[]) => {
    onReorder(nextTracks.map((track) => track.id));
  }, [onReorder]);

  const reorderToTarget = useCallback((sourceId: string, targetId: string) => {
    const nextTracks = moveTrack(tracks, sourceId, targetId);
    if (nextTracks === tracks) return;
    setTracks(nextTracks);
    commitOrder(nextTracks);
  }, [commitOrder, tracks]);

  const handleDrop = useCallback((targetId: string, event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData('text/plain') || draggedTrackId;
    setDraggedTrackId(null);
    if (!sourceId) return;
    reorderToTarget(sourceId, targetId);
  }, [draggedTrackId, reorderToTarget]);

  useEffect(() => {
    if (!mouseDragTrackId) return;
    const sourceId = mouseDragTrackId;

    function handleMouseUp(event: MouseEvent) {
      const targetId = findTrackIdAtPoint(event.clientX, event.clientY);
      setMouseDragTrackId(null);
      if (targetId) reorderToTarget(sourceId, targetId);
    }

    function handleMouseMove(event: MouseEvent) {
      event.preventDefault();
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp, {once: true});
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [mouseDragTrackId, reorderToTarget]);

  return (
    <section className="card playlist-editor">
      <div className="section-heading"><h2>Playlist</h2><span>{tracks.length} tracks</span></div>
      <p className="playlist-help">拖动每首歌左侧的手柄来调整顺序；只会保存歌单顺序，不会自动生成视频。</p>
      <div className="track-list">
        {tracks.map((track, index) => (
          <article
            aria-label={`Track ${index + 1}: ${track.title}`}
            className={`track-row${draggedTrackId === track.id || mouseDragTrackId === track.id ? ' dragging' : ''}`}
            data-track-id={track.id}
            key={track.id}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(track.id, event)}
          >
            <button
              aria-label={`Drag ${track.title}`}
              className="drag-handle"
              draggable
              onDragEnd={() => setDraggedTrackId(null)}
              onDragStart={(event) => {
                setDraggedTrackId(track.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', track.id);
              }}
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                setMouseDragTrackId(track.id);
              }}
              title="Drag to reorder"
              type="button"
            >
              <span aria-hidden="true">☰</span>
              <span>{String(index + 1).padStart(2, '0')}</span>
            </button>
            {track.coverPreviewUrl ? <img src={track.coverPreviewUrl} alt="" /> : <div className="cover-placeholder" />}
            <div>
              <input aria-label="Track title" value={track.title} onChange={(event) => onUpdateTrack({trackId: track.id, title: event.target.value, artist: track.artist})} />
              <input aria-label="Track artist" value={track.artist} onChange={(event) => onUpdateTrack({trackId: track.id, title: track.title, artist: event.target.value})} />
            </div>
            <time>{Math.floor(track.durationSeconds / 60)}:{Math.floor(track.durationSeconds % 60).toString().padStart(2, '0')}</time>
          </article>
        ))}
      </div>
    </section>
  );
};

