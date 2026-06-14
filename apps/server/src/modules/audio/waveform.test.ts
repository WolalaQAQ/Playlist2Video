import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {createFixtureAudio, hasFfmpeg} from '../../test/create-fixture-audio';
import {extractWaveformPeaks} from './waveform';
import {execa} from 'execa';

describe('extractWaveformPeaks', () => {
  it('derives normalized peaks from the actual audio file', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping waveform extraction test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-waveform-'));
    const [audioPath] = await createFixtureAudio(root);

    const peaks = await extractWaveformPeaks({filePath: audioPath, samples: 32});

    expect(peaks).toHaveLength(32);
    expect(peaks.every((peak) => peak >= 0 && peak <= 1)).toBe(true);
    expect(peaks.some((peak) => peak > 0)).toBe(true);
  }, 30000);

  it('samples across the whole file instead of only the beginning', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping waveform extraction test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-waveform-'));
    const audioPath = path.join(root, 'silence-then-tone.wav');
    await execa('ffmpeg', [
      '-y',
      '-f',
      'lavfi',
      '-i',
      'anullsrc=r=44100:cl=mono:d=1',
      '-f',
      'lavfi',
      '-i',
      'sine=frequency=880:duration=1',
      '-filter_complex',
      '[0:a][1:a]concat=n=2:v=0:a=1',
      audioPath,
    ]);

    const peaks = await extractWaveformPeaks({filePath: audioPath, samples: 8});
    const firstHalfAverage = peaks.slice(0, 4).reduce((sum, peak) => sum + peak, 0) / 4;
    const secondHalfAverage = peaks.slice(4).reduce((sum, peak) => sum + peak, 0) / 4;

    expect(secondHalfAverage).toBeGreaterThan(firstHalfAverage + 0.4);
  }, 30000);
});
