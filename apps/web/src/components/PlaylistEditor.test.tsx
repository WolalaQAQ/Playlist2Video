// @vitest-environment jsdom
import React from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {PlaylistEditor} from './PlaylistEditor';

const project: Project = {
  id: 'project-1',
  name: 'Preview',
  sourceFolder: 'C:/Music',
  tracks: [{
    id: 'track-1',
    sourcePath: 'C:/Music/song.mp3',
    title: 'Song',
    artist: 'Artist',
    album: null,
    durationSeconds: 1,
    coverPath: 'C:/Assets/cover.jpg',
    renderCoverPath: 'cover.jpg',
    audioPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/audio?v=song.mp3',
    coverPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg',
    order: 0,
  }],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('PlaylistEditor', () => {
  it('uses browser-safe cover preview URLs instead of file URLs', () => {
    render(<PlaylistEditor project={project} onReorder={vi.fn()} onUpdateTrack={vi.fn()} />);

    expect(screen.getByRole('presentation').getAttribute('src')).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg');
  });
});
