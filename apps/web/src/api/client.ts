import type {Project} from '@playlist2video/shared';
const apiBase = 'http://127.0.0.1:4317/api/v1';
interface ApiSuccess<T> { data: T }

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {headers: {'Content-Type': 'application/json', ...options?.headers}, ...options});
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? 'Request failed');
  return (body as ApiSuccess<T>).data;
}

export const scanFolder = (folderPath: string) => request<{project: Project; warnings: string[]}>('/projects/scan', {method: 'POST', body: JSON.stringify({folderPath})});
export const getCurrentProject = () => request<Project>('/projects/current');
export const reorderTracks = (trackIds: string[]) => request<Project>('/projects/current/reorder', {method: 'PATCH', body: JSON.stringify({trackIds})});
export const updateTrackMetadata = (input: {trackId: string; title: string; artist: string}) => request<Project>('/projects/current/tracks', {method: 'PATCH', body: JSON.stringify(input)});
export const exportCurrentProject = () => request<{outputPath: string}>('/exports', {method: 'POST'});
