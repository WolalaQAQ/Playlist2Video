import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {createFixtureAudio, hasFfmpeg} from '../../test/create-fixture-audio';
import {scanFolder} from './scan-folder';

describe('scanFolder integration', () => {
  it('scans generated audio fixtures', async () => {
    if (!(await hasFfmpeg())) {
      console.warn('Skipping FFmpeg integration test because ffmpeg is not available on PATH.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'playlist2video-fixture-'));
    const audioDir = path.join(root, 'audio');
    const assetsDir = path.join(root, 'assets');
    await createFixtureAudio(audioDir);
    const result = await scanFolder({folderPath: audioDir, assetsDir});
    expect(result.tracks).toHaveLength(2);
    expect(result.tracks[0].title).toContain('01 - sine');
    expect(result.tracks[0].durationSeconds).toBeGreaterThan(0);
    expect(result.tracks[0].coverPath).toContain('fallback');
  }, 30000);
});
