import {beforeEach, describe, expect, it, vi} from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';
import type {Project} from '@playlist2video/shared';
import {registerExportRoutes} from './export-routes';
import {ProjectStore} from '../projects/project-store';

const exportMocks = vi.hoisted(() => ({
  exportProject: vi.fn(),
  exportProjectStills: vi.fn(),
}));

vi.mock('./export-service', () => ({
  exportProject: exportMocks.exportProject,
}));

vi.mock('./still-export-service', () => ({
  exportProjectStills: exportMocks.exportProjectStills,
}));

const config = {
  host: '127.0.0.1',
  port: 0,
  workspaceDir: 'C:/workspace',
  assetsDir: 'C:/workspace/assets',
  outputDir: 'C:/workspace/output',
};

const previewProject = {
  id: 'project-preview',
  name: 'Preview',
  sourceFolder: 'C:/Music',
  tracks: [],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', videoBitrateKbps: 12000, spectrumFps: 30, renderQuality: 'high', frameImageFormat: 'jpeg', jpegQuality: 100, outputFileName: 'playlist-video.mp4', audioCodec: 'aac', audioBitrateKbps: 320, audioSampleRate: 48000, audioChannels: 2, audioVolumePercent: 100},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
} satisfies Project;

async function setupSavedProject(spectrumFrames: number[][]) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'p2v-export-routes-'));
  const store = new ProjectStore(root);
  const saved = await store.save({
    name: 'Saved',
    sourceFolder: 'C:/Music',
    tracks: [{
      id: 'track-1',
      sourcePath: 'C:/Music/01.mp3',
      title: 'Original',
      artist: 'Artist',
      album: null,
      durationSeconds: 10,
      coverPath: null,
      renderCoverPath: null,
      waveformPeaks: [0.1, 0.2],
      spectrumFrames,
      order: 0,
    }],
    theme: previewProject.theme,
    exportConfig: previewProject.exportConfig,
  });
  const tmpConfig = {host: '127.0.0.1', port: 0, workspaceDir: root, assetsDir: path.join(root, 'assets'), outputDir: path.join(root, 'output')};
  return {root, saved, config: tmpConfig};
}

describe('export routes', () => {
  beforeEach(() => {
    exportMocks.exportProject.mockReset();
    exportMocks.exportProjectStills.mockReset();
    exportMocks.exportProjectStills.mockReset();
    exportMocks.exportProject.mockResolvedValue({outputPath: 'C:/workspace/output/playlist-video.mp4'});
  });

  it('exports the posted preview project snapshot instead of always loading the saved project', async () => {
    const app = Fastify();
    await registerExportRoutes(app, config);

    const response = await app.inject({method: 'POST', url: '/api/v1/exports', payload: {project: previewProject}});

    expect(response.statusCode).toBe(200);
    expect(exportMocks.exportProject).toHaveBeenCalledWith(expect.objectContaining({project: previewProject}));
    await app.close();
  });

  it('rehydrates spectrumFrames from the saved project for tracks in the posted snapshot', async () => {
    const {saved, config: tmpConfig} = await setupSavedProject([[0.5, 0.6]]);
    const app = Fastify();
    await registerExportRoutes(app, tmpConfig);

    // The web client strips heavy spectrumFrames before posting; the snapshot still edits the title.
    const snapshot = {
      ...saved,
      tracks: saved.tracks.map((track) => {
        const copy: Record<string, unknown> = {...track, title: 'Edited Title'};
        delete copy.spectrumFrames;
        return copy;
      }),
    };

    const response = await app.inject({method: 'POST', url: '/api/v1/exports', payload: {project: snapshot}});

    expect(response.statusCode).toBe(200);
    const calledProject = exportMocks.exportProject.mock.calls[0][0].project as Project;
    expect(calledProject.tracks[0].title).toBe('Edited Title');
    expect(calledProject.tracks[0].spectrumFrames).toEqual([[0.5, 0.6]]);
    await app.close();
  });

  it('exports still images from the posted preview project snapshot', async () => {
    exportMocks.exportProjectStills.mockResolvedValue({outputDir: 'C:/workspace/output/stills', files: []});
    const app = Fastify();
    await registerExportRoutes(app, config);

    const response = await app.inject({method: 'POST', url: '/api/v1/exports/stills', payload: {project: previewProject}});

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data).toEqual({outputDir: 'C:/workspace/output/stills', files: []});
    expect(exportMocks.exportProjectStills).toHaveBeenCalledWith(expect.objectContaining({project: previewProject}));
    await app.close();
  });
  it('rehydrates spectrumFrames for still image exports from stripped preview snapshots', async () => {
    exportMocks.exportProjectStills.mockResolvedValue({outputDir: 'C:/workspace/output/stills', files: []});
    const {saved, config: tmpConfig} = await setupSavedProject([[0.7, 0.8]]);
    const app = Fastify();
    await registerExportRoutes(app, tmpConfig);
    const snapshot = {
      ...saved,
      tracks: saved.tracks.map((track) => {
        const copy: Record<string, unknown> = {...track, title: 'Still Edited'};
        delete copy.spectrumFrames;
        return copy;
      }),
    };

    const response = await app.inject({method: 'POST', url: '/api/v1/exports/stills', payload: {project: snapshot}});

    expect(response.statusCode).toBe(200);
    const calledProject = exportMocks.exportProjectStills.mock.calls[0][0].project as Project;
    expect(calledProject.tracks[0].title).toBe('Still Edited');
    expect(calledProject.tracks[0].spectrumFrames).toEqual([[0.7, 0.8]]);
    await app.close();
  });
});
