import fs from 'node:fs/promises';
import path from 'node:path';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import type {ExportConfig, Project} from '@playlist2video/shared';
import {execa} from 'execa';
import {resolveInside} from '../../lib/path-safety';

export function escapeFfmpegConcatPath(filePath: string): string {
  return filePath.replaceAll("'", "'\\''");
}

export function buildFfmpegConcatList(filePaths: string[]): string {
  return filePaths.map((filePath) => `file '${escapeFfmpegConcatPath(filePath)}'`).join('\n') + '\n';
}

export function getOutputPath(outputDir: string, outputFileName: string): string {
  return resolveInside(outputDir, outputFileName);
}

export function getRemotionEntryPoint(): string {
  return path.resolve('packages/video-template/src/render-entry.tsx');
}

export function buildAudioFfmpegArgs(concatListPath: string, concatAudioPath: string, exportConfig: ExportConfig): string[] {
  return [
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatListPath,
    '-c:a',
    exportConfig.audioCodec,
    '-b:a',
    `${exportConfig.audioBitrateKbps}k`,
    '-ar',
    String(exportConfig.audioSampleRate),
    '-ac',
    String(exportConfig.audioChannels),
    '-filter:a',
    `volume=${exportConfig.audioVolumePercent / 100}`,
    concatAudioPath,
  ];
}

export async function exportProject(options: {project: Project; outputDir: string; workspaceDir: string; onProgress?: (progress: number) => void}): Promise<{outputPath: string}> {
  await fs.mkdir(options.outputDir, {recursive: true});
  const tempDir = path.join(options.workspaceDir, '.tmp', `export-${Date.now()}`);
  await fs.mkdir(tempDir, {recursive: true});

  const tracks = [...options.project.tracks].sort((a, b) => a.order - b.order);
  const concatListPath = path.join(tempDir, 'audio-list.txt');
  const concatAudioPath = path.join(tempDir, 'audio.m4a');
  const videoOnlyPath = path.join(tempDir, 'video.mp4');
  const outputPath = getOutputPath(options.outputDir, options.project.exportConfig.outputFileName);

  await fs.writeFile(concatListPath, buildFfmpegConcatList(tracks.map((track) => track.sourcePath)), 'utf8');
  await execa('ffmpeg', buildAudioFfmpegArgs(concatListPath, concatAudioPath, options.project.exportConfig));
  options.onProgress?.(0.2);

  const serveUrl = await bundle({entryPoint: getRemotionEntryPoint(), publicDir: path.join(options.workspaceDir, 'assets')});
  const composition = await selectComposition({serveUrl, id: 'PlaylistVideo', inputProps: {project: options.project}});
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: videoOnlyPath,
    inputProps: {project: options.project},
    onProgress: ({progress}) => options.onProgress?.(0.2 + progress * 0.6),
  });

  await execa('ffmpeg', ['-y', '-i', videoOnlyPath, '-i', concatAudioPath, '-c:v', 'copy', '-c:a', 'copy', '-shortest', outputPath]);
  options.onProgress?.(1);
  return {outputPath};
}
