import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {defaultThemeConfig} from '@playlist2video/shared';
import {buildApp} from '../../app';
import type {ServerConfig} from '../../config';
import {ProjectStore} from './project-store';

async function setupProject() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p2v-project-routes-'));
  const audioPath = path.join(root, 'song.mp3');
  const coverPath = path.join(root, 'cover.jpg');
  await fs.writeFile(audioPath, 'audio-bytes');
  await fs.writeFile(coverPath, 'cover-bytes');
  const store = new ProjectStore(root);
  const project = await store.save({
    name: 'Media Test',
    sourceFolder: root,
    tracks: [{
      id: 'track-1',
      sourcePath: audioPath,
      title: 'Song',
      artist: 'Artist',
      album: null,
      durationSeconds: 1,
      coverPath,
      renderCoverPath: 'cover.jpg',
      order: 0,
    }],
    theme: defaultThemeConfig,
    exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  });
  const config: ServerConfig = {host: '127.0.0.1', port: 0, workspaceDir: root, assetsDir: path.join(root, 'assets'), outputDir: path.join(root, 'output')};
  return {root, project, config};
}

describe('project routes media preview', () => {
  it('hydrates current project tracks with browser-safe preview URLs', async () => {
    const {config} = await setupProject();
    const app = await buildApp(config);

    const response = await app.inject({method: 'GET', url: '/api/v1/projects/current'});

    expect(response.statusCode).toBe(200);
    expect(response.json().data.tracks[0]).toMatchObject({
      audioPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/audio?v=song.mp3',
      coverPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg',
    });
    await app.close();
  });

  it('serves only media files referenced by the current project', async () => {
    const {config} = await setupProject();
    const app = await buildApp(config);

    const audioResponse = await app.inject({method: 'GET', url: '/api/v1/projects/current/media/track-1/audio'});
    const coverResponse = await app.inject({method: 'GET', url: '/api/v1/projects/current/media/track-1/cover'});
    const missingResponse = await app.inject({method: 'GET', url: '/api/v1/projects/current/media/../escape/audio'});

    expect(audioResponse.statusCode).toBe(200);
    expect(audioResponse.body).toBe('audio-bytes');
    expect(coverResponse.statusCode).toBe(200);
    expect(coverResponse.body).toBe('cover-bytes');
    expect(missingResponse.statusCode).toBe(404);
    await app.close();
  });
});
