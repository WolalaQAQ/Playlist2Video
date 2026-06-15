import {beforeEach, describe, expect, it, vi} from 'vitest';
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

  it('keeps the JSON content type when a request has a JSON body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(successfulJson({project: null, warnings: []}));

    await scanFolder('C:/Music');

    const [, init] = fetchMock.mock.calls[0];
    const headers = new Headers(init?.headers);
    expect(init?.body).toBe(JSON.stringify({folderPath: 'C:/Music'}));
    expect(headers.get('Content-Type')).toBe('application/json');
  });
});
