import path from 'node:path';
import fs from 'node:fs/promises';
import {expect, it} from 'vitest';
import type {ExportConfig} from '@playlist2video/shared';
import {buildAudioFfmpegArgs, buildFfmpegConcatList, getOutputPath, getRemotionEntryPoint} from './export-service';

it('builds a quoted concat list for FFmpeg', () => {
  expect(buildFfmpegConcatList(['C:/Music/01.mp3', "C:/Music/O'Hara.mp3"])).toBe("file 'C:/Music/01.mp3'\nfile 'C:/Music/O'\\''Hara.mp3'\n");
});

it('resolves output path inside output directory', () => {
  expect(getOutputPath(path.resolve('output'), 'playlist-video.mp4')).toBe(path.join(path.resolve('output'), 'playlist-video.mp4'));
});

it('uses a Remotion entry point that registers the root component', async () => {
  const entryPoint = getRemotionEntryPoint();
  expect(path.basename(entryPoint)).toBe('render-entry.tsx');
  await expect(fs.readFile(entryPoint, 'utf8')).resolves.toContain('registerRoot(');
});

it('builds FFmpeg audio concat arguments from export settings', () => {
  const exportConfig: ExportConfig = {
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    outputFileName: 'playlist-video.mp4',
    audioCodec: 'aac',
    audioBitrateKbps: 256,
    audioSampleRate: 44100,
    audioChannels: 1,
    audioVolumePercent: 85,
  };

  expect(buildAudioFfmpegArgs('audio-list.txt', 'audio.m4a', exportConfig)).toEqual([
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    'audio-list.txt',
    '-c:a',
    'aac',
    '-b:a',
    '256k',
    '-ar',
    '44100',
    '-ac',
    '1',
    '-filter:a',
    'volume=0.85',
    'audio.m4a',
  ]);
});
