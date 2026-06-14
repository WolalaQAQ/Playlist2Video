import type {TimelineTrack, Track} from './schemas';

export function buildTimeline(tracks: Track[]): TimelineTrack[] {
  const ordered = [...tracks].sort((a, b) => a.order - b.order);
  let cursor = 0;
  return ordered.map((track) => {
    const startSeconds = cursor;
    const endSeconds = startSeconds + track.durationSeconds;
    cursor = endSeconds;
    return {...track, startSeconds, endSeconds};
  });
}

export function findTrackAtTime(timeline: TimelineTrack[], timeSeconds: number): TimelineTrack | null {
  if (timeline.length === 0) return null;
  return timeline.find((track) => timeSeconds >= track.startSeconds && timeSeconds < track.endSeconds) ?? timeline[timeline.length - 1];
}

export function getTotalDuration(timeline: TimelineTrack[]): number {
  return timeline.at(-1)?.endSeconds ?? 0;
}
