import path from 'node:path';
import {supportedAudioExtensions} from '@playlist2video/shared';

export function isSupportedAudioFile(filePath: string): boolean {
  return supportedAudioExtensions.includes(path.extname(filePath).toLowerCase() as (typeof supportedAudioExtensions)[number]);
}

export function deriveTitleFromFileName(filePath: string): string {
  return path.parse(filePath).name.replaceAll('_', ' ').trim();
}
