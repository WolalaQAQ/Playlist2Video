import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {expect, it} from 'vitest';
import {defaultThemeConfig} from '@playlist2video/shared';
import {ProjectStore} from './project-store';

it('saves and loads the current project', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p2v-store-'));
  const store = new ProjectStore(root);
  const project = await store.save({
    name: 'Test',
    sourceFolder: 'C:/Music',
    tracks: [],
    theme: defaultThemeConfig,
    exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  });
  expect(await store.load()).toEqual(project);
});
