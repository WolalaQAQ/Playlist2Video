import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import type {IAudioMetadata} from 'music-metadata';
import {describe, expect, it} from 'vitest';
import {writeCoverAsset, writeFallbackCover} from '../assets/cover-assets';

describe('cover assets', () => {
  it('writes a generated fallback cover when a track has no embedded artwork', async () => {
    const assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-covers-'));

    const outputPath = await writeFallbackCover({assetsDir, trackId: 'track-1', title: 'Alpha'});

    expect(outputPath).toEqual({filePath: path.join(assetsDir, 'track-1-fallback.jpg'), renderPath: 'track-1-fallback.jpg'});
    await expect(fs.access(outputPath.filePath)).resolves.toBeUndefined();
    const metadata = await sharp(outputPath.filePath).metadata();
    expect(metadata.format).toBe('jpeg');
    expect(metadata.width).toBe(900);
    expect(metadata.height).toBe(900);
  });

  it('resizes embedded artwork to a square JPEG cover', async () => {
    const assetsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-covers-'));
    const picture = await sharp({
      create: {width: 32, height: 16, channels: 3, background: '#ff00aa'},
    }).png().toBuffer();
    const metadata = {
      common: {picture: [{format: 'image/png', data: picture}]},
      format: {},
    } as unknown as IAudioMetadata;

    const outputPath = await writeCoverAsset({assetsDir, trackId: 'track-2', metadata});

    expect(outputPath).toEqual({filePath: path.join(assetsDir, 'track-2.jpg'), renderPath: 'track-2.jpg'});
    if (outputPath === null) throw new Error('Expected embedded artwork to produce a cover path');
    const image = await sharp(outputPath.filePath).metadata();
    expect(image.format).toBe('jpeg');
    expect(image.width).toBe(900);
    expect(image.height).toBe(900);
  });
});
