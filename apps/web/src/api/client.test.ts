import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {exportCurrentProject, scanFolder} from './client';

function successfulJson<T>(data: T): Response {
  return {
    ok: true,
    json: async () => ({data}),
  } as Response;
}

describe('api client request headers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('does not send a JSON content type when exporting with an empty POST body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({outputPath: 'C:/out/playlist-video.mp4'}));

    await exportCurrentProject();

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBeUndefined();
    expect(headers.has('Content-Type')).toBe(false);
  });

  it('sends the preview project snapshot when exporting a generated preview', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({outputPath: 'C:/out/playlist-video.mp4'}));
    const project = {id: 'project-1', tracks: []} as unknown as Project;

    await exportCurrentProject(project);

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({project}));
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  it('omits heavy spectrumFrames from the export request body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({outputPath: 'C:/out/playlist-video.mp4'}));
    const project = {
      id: 'project-1',
      tracks: [{id: 'track-1', spectrumFrames: [[0.1, 0.2], [0.3, 0.4]]}],
    } as unknown as Project;

    await exportCurrentProject(project);

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    expect(body.project.tracks[0]).not.toHaveProperty('spectrumFrames');
    expect(body.project.tracks[0].id).toBe('track-1');
  });

  it('keeps the JSON content type when a request has a JSON body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({project: null, warnings: []}));

    await scanFolder('C:/Music');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.body).toBe(JSON.stringify({folderPath: 'C:/Music'}));
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
