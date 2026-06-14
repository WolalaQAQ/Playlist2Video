import path from 'node:path';
import {expect, it} from 'vitest';
import {buildFfmpegConcatList, getOutputPath} from './export-service';

it('builds a quoted concat list for FFmpeg', () => {
  expect(buildFfmpegConcatList(['C:/Music/01.mp3', "C:/Music/O'Hara.mp3"])).toBe("file 'C:/Music/01.mp3'\nfile 'C:/Music/O'\\''Hara.mp3'\n");
});

it('resolves output path inside output directory', () => {
  expect(getOutputPath(path.resolve('output'), 'playlist-video.mp4')).toBe(path.join(path.resolve('output'), 'playlist-video.mp4'));
});
