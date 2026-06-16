import {beforeEach, describe, expect, it, vi} from 'vitest';
import Fastify from 'fastify';
import type {Project} from '@playlist2video/shared';
import {registerExportRoutes} from './export-routes';

const exportMocks = vi.hoisted(() => ({
  exportProject: vi.fn(),
}));

vi.mock('./export-service', () => ({
  exportProject: exportMocks.exportProject,
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
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', videoBitrateKbps: 12000, spectrumFps: 30, renderQuality: 'high', outputFileName: 'playlist-video.mp4', audioCodec: 'aac', audioBitrateKbps: 320, audioSampleRate: 48000, audioChannels: 2, audioVolumePercent: 100},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
} satisfies Project;

describe('export routes', () => {
  beforeEach(() => {
    exportMocks.exportProject.mockReset();
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
});
