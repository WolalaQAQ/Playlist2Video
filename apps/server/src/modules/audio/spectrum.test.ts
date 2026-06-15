import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execa} from 'execa';
import {describe, expect, it} from 'vitest';
import {hasFfmpeg} from '../../test/create-fixture-audio';
import {extractSpectrumFrames} from './spectrum';

function strongestAverageBand(frames: number[][]): number {
  const bands = frames[0]?.length ?? 0;
  const averages = Array.from({length: bands}, (_, band) => frames.reduce((sum, frame) => sum + (frame[band] ?? 0), 0) / frames.length);
  return averages.reduce((best, value, index) => (value > averages[best] ? index : best), 0);
}

describe('extractSpectrumFrames', () => {
  it('extracts frequency-band frames from the audio file', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping spectrum extraction test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-spectrum-'));
    const audioPath = path.join(root, 'tone.wav');
    await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', audioPath]);

    const frames = await extractSpectrumFrames({filePath: audioPath, bands: 32, framesPerSecond: 12});

    expect(frames.length).toBeGreaterThan(4);
    expect(frames[0]).toHaveLength(32);
    expect(frames.flat().every((value) => value >= 0 && value <= 1)).toBe(true);
    expect(frames.flat().some((value) => value > 0.25)).toBe(true);
  }, 30000);

  it('uses high-density frames by default for smooth 30fps preview motion', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping spectrum extraction test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-spectrum-'));
    const audioPath = path.join(root, 'tone.wav');
    await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=880:duration=1', audioPath]);

    const frames = await extractSpectrumFrames({filePath: audioPath, bands: 16});

    expect(frames.length).toBeGreaterThanOrEqual(29);
  }, 30000);

  it('places higher tones in higher frequency bands', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping spectrum extraction test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-spectrum-'));
    const lowPath = path.join(root, 'low.wav');
    const highPath = path.join(root, 'high.wav');
    await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=1', lowPath]);
    await execa('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=2200:duration=1', highPath]);

    const lowFrames = await extractSpectrumFrames({filePath: lowPath, bands: 48, framesPerSecond: 12});
    const highFrames = await extractSpectrumFrames({filePath: highPath, bands: 48, framesPerSecond: 12});

    expect(strongestAverageBand(highFrames)).toBeGreaterThan(strongestAverageBand(lowFrames) + 12);
  }, 30000);
});
