import fs from 'node:fs/promises';
import path from 'node:path';
import type {Track} from '@playlist2video/shared';
import {writeCoverAsset, writeFallbackCover} from '../assets/cover-assets';
import {isSupportedAudioFile} from './audio-file';
import {buildTrackFromMetadata, readAudioMetadata} from './metadata';

export interface ScanFolderResult {
  tracks: Track[];
  warnings: string[];
}

export async function scanFolder(options: {folderPath: string; assetsDir: string}): Promise<ScanFolderResult> {
  const entries = await fs.readdir(options.folderPath, {withFileTypes: true});
  const filePaths = entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(options.folderPath, entry.name))
    .filter(isSupportedAudioFile)
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b), undefined, {numeric: true}));

  const tracks: Track[] = [];
  const warnings: string[] = [];

  for (const [order, filePath] of filePaths.entries()) {
    try {
      const metadata = await readAudioMetadata(filePath);
      const durationSeconds = metadata.format.duration;
      if (!durationSeconds || durationSeconds <= 0) {
        warnings.push(`Skipped ${filePath}: missing duration`);
        continue;
      }
      const base = buildTrackFromMetadata({filePath, order, durationSeconds, metadata, coverPath: null});
      const cover = (await writeCoverAsset({metadata, assetsDir: options.assetsDir, trackId: base.id})) ??
        (await writeFallbackCover({assetsDir: options.assetsDir, trackId: base.id, title: base.title}));
      tracks.push({...base, coverPath: cover.filePath, renderCoverPath: cover.renderPath});
    } catch (error) {
      warnings.push(`Skipped ${filePath}: ${error instanceof Error ? error.message : 'unknown error'}`);
    }
  }

  return {tracks, warnings};
}
