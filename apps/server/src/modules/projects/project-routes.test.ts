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
    exportConfig: {
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: 'h264',
      outputFileName: 'playlist-video.mp4',
      audioCodec: 'aac',
      audioBitrateKbps: 320,
      audioSampleRate: 48000,
      audioChannels: 2,
      audioVolumePercent: 100,
    },
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

  it('supports HTTP range requests for audio seeking', async () => {
    const {config} = await setupProject();
    const app = await buildApp(config);

    const response = await app.inject({
      method: 'GET',
      url: '/api/v1/projects/current/media/track-1/audio',
      headers: {range: 'bytes=2-6'},
    });

    expect(response.statusCode).toBe(206);
    expect(response.headers['accept-ranges']).toBe('bytes');
    expect(response.headers['content-range']).toBe('bytes 2-6/11');
    expect(response.headers['content-length']).toBe('5');
    expect(response.body).toBe('dio-b');
    await app.close();
  });
});

describe('project settings route', () => {
  it('saves theme and export settings on the current project', async () => {
    const {config} = await setupProject();
    const app = await buildApp(config);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/projects/current/settings',
      payload: {
        theme: {effectIntensity: 'medium', showParticles: false, showPulseRings: false},
        exportConfig: {
          width: 1280,
          height: 720,
          fps: 24,
          outputFileName: 'custom-playlist.mp4',
          audioBitrateKbps: 256,
          audioSampleRate: 44100,
          audioChannels: 1,
          audioVolumePercent: 85,
        },
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data.theme).toMatchObject({
      themeId: 'playlist-v4',
      effectIntensity: 'medium',
      showParticles: false,
      showPulseRings: false,
      playlistPanelMode: 'full',
    });
    expect(response.json().data.exportConfig).toEqual({
      width: 1280,
      height: 720,
      fps: 24,
      videoCodec: 'h264',
      outputFileName: 'custom-playlist.mp4',
      audioCodec: 'aac',
      audioBitrateKbps: 256,
      audioSampleRate: 44100,
      audioChannels: 1,
      audioVolumePercent: 85,
    });

    const persisted = await new ProjectStore(config.workspaceDir).load();
    expect(persisted.theme.effectIntensity).toBe('medium');
    expect(persisted.theme.showParticles).toBe(false);
    expect(persisted.theme.showPulseRings).toBe(false);
    expect(persisted.exportConfig.width).toBe(1280);
    expect(persisted.exportConfig.height).toBe(720);
    expect(persisted.exportConfig.fps).toBe(24);
    expect(persisted.exportConfig.outputFileName).toBe('custom-playlist.mp4');
    expect(persisted.exportConfig.audioBitrateKbps).toBe(256);
    expect(persisted.exportConfig.audioSampleRate).toBe(44100);
    expect(persisted.exportConfig.audioChannels).toBe(1);
    expect(persisted.exportConfig.audioVolumePercent).toBe(85);
    await app.close();
  });

  it('rejects invalid theme and export settings', async () => {
    const {config} = await setupProject();
    const app = await buildApp(config);

    const response = await app.inject({
      method: 'PATCH',
      url: '/api/v1/projects/current/settings',
      payload: {
        theme: {effectIntensity: 'extreme'},
        exportConfig: {width: 0, fps: 0, outputFileName: '', audioBitrateKbps: 0, audioSampleRate: 0, audioChannels: 0, audioVolumePercent: 0},
      },
    });

    expect(response.statusCode).toBe(422);
    expect(response.json().error.code).toBe('validation_error');
    await app.close();
  });
});

