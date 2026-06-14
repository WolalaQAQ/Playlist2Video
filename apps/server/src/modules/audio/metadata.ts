import crypto from 'node:crypto';
import {parseFile, type IAudioMetadata} from 'music-metadata';
import type {Track} from '@playlist2video/shared';
import {deriveTitleFromFileName} from './audio-file';

type MetadataForTrack = {
  common: {
    title?: string;
    artist?: string;
    album?: string;
  };
  format?: unknown;
};

export async function readAudioMetadata(filePath: string): Promise<IAudioMetadata> {
  return parseFile(filePath, {duration: true});
}

export function buildTrackFromMetadata(input: {
  filePath: string;
  order: number;
  durationSeconds: number;
  metadata: MetadataForTrack;
  coverPath: string | null;
}): Track {
  return {
    id: `track-${crypto.createHash('sha1').update(input.filePath).digest('hex').slice(0, 12)}`,
    sourcePath: input.filePath,
    title: input.metadata.common.title?.trim() || deriveTitleFromFileName(input.filePath),
    artist: input.metadata.common.artist?.trim() || 'Unknown Artist',
    album: input.metadata.common.album?.trim() || null,
    durationSeconds: input.durationSeconds,
    coverPath: input.coverPath,
    order: input.order,
  };
}
