import path from 'node:path';
import type {Project, Track} from '@playlist2video/shared';

const apiOrigin = process.env.PLAYLIST2VIDEO_API_ORIGIN ?? 'http://127.0.0.1:4317';

export function getTrackMediaUrl(track: Track, kind: 'audio' | 'cover'): string | null {
  const sourcePath = kind === 'audio' ? track.sourcePath : track.coverPath;
  if (!sourcePath) return null;
  return `${apiOrigin}/api/v1/projects/current/media/${track.id}/${kind}?v=${encodeURIComponent(path.basename(sourcePath))}`;
}

export function hydrateProjectMediaUrls(project: Project): Project {
  return {
    ...project,
    tracks: project.tracks.map((track) => ({
      ...track,
      audioPreviewUrl: getTrackMediaUrl(track, 'audio'),
      coverPreviewUrl: getTrackMediaUrl(track, 'cover'),
    })),
  };
}

export function resolveProjectMediaPath(project: Project, trackId: string, kind: 'audio' | 'cover'): string | null {
  const track = project.tracks.find((candidate) => candidate.id === trackId);
  if (!track) return null;
  return kind === 'audio' ? track.sourcePath : track.coverPath;
}
