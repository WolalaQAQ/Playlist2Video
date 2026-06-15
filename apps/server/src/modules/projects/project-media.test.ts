import path from 'node:path';
import {describe, expect, it} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {getTrackMediaUrl, hydrateProjectMediaUrls, resolveProjectMediaPath} from './project-media';

const project: Project = {
  id: 'project-1',
  name: 'Test',
  sourceFolder: path.resolve('music'),
  tracks: [
    {
      id: 'track-1',
      sourcePath: path.resolve('music/song one.mp3'),
      title: 'Song One',
      artist: 'Artist',
      album: null,
      durationSeconds: 10,
      coverPath: path.resolve('assets/cover one.jpg'),
      renderCoverPath: 'cover one.jpg',
      order: 0,
    },
  ],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4', audioCodec: 'aac', audioBitrateKbps: 320, audioSampleRate: 48000, audioChannels: 2, audioVolumePercent: 100},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('project media urls', () => {
  it('adds stable preview URLs for scanned audio and cover files', () => {
    const hydrated = hydrateProjectMediaUrls(project);

    expect(hydrated.tracks[0].audioPreviewUrl).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/audio?v=song%20one.mp3');
    expect(hydrated.tracks[0].coverPreviewUrl).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover%20one.jpg');
  });

  it('does not build a cover URL when a track has no cover', () => {
    expect(getTrackMediaUrl({...project.tracks[0], coverPath: null}, 'cover')).toBeNull();
  });

  it('resolves only media paths already present in the current project', () => {
    expect(resolveProjectMediaPath(project, 'track-1', 'audio')).toBe(project.tracks[0].sourcePath);
    expect(resolveProjectMediaPath(project, 'track-1', 'cover')).toBe(project.tracks[0].coverPath);
    expect(resolveProjectMediaPath(project, '../escape', 'audio')).toBeNull();
  });
});


