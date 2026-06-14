// @vitest-environment jsdom
import React from 'react';
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {PlaylistVideo} from './PlaylistVideo';

vi.mock('remotion', async () => {
  const ReactActual = await vi.importActual<typeof React>('react');
  return {
    Audio: ({src, from, durationInFrames}: {src: string; from: number; durationInFrames: number}) =>
      ReactActual.createElement('audio', {'data-testid': 'preview-audio', src, 'data-from': from, 'data-duration': durationInFrames}),
    Img: ({src, className}: {src: string; className?: string}) => ReactActual.createElement('img', {src, className, alt: ''}),
    interpolate: () => 0.5,
    Sequence: ({children, from, durationInFrames}: {children: React.ReactNode; from: number; durationInFrames: number}) =>
      ReactActual.createElement('div', {'data-sequence-from': from, 'data-sequence-duration': durationInFrames}, children),
    staticFile: (input: string) => `/static/${input}`,
    useCurrentFrame: () => 0,
    useVideoConfig: () => ({fps: 30}),
  };
});

const project: Project = {
  id: 'project-1',
  name: 'Preview',
  sourceFolder: 'C:/Music',
  tracks: [
    {
      id: 'track-1',
      sourcePath: 'C:/Music/01.mp3',
      title: 'First',
      artist: 'Artist',
      album: null,
      durationSeconds: 2,
      coverPath: 'C:/Assets/cover.jpg',
      renderCoverPath: 'cover.jpg',
      audioPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/audio?v=01.mp3',
      coverPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg',
      order: 0,
    },
    {
      id: 'track-2',
      sourcePath: 'C:/Music/02.mp3',
      title: 'Second',
      artist: 'Artist',
      album: null,
      durationSeconds: 3,
      coverPath: null,
      renderCoverPath: null,
      audioPreviewUrl: 'http://127.0.0.1:4317/api/v1/projects/current/media/track-2/audio?v=02.mp3',
      coverPreviewUrl: null,
      order: 1,
    },
  ],
  theme: {themeId: 'playlist-v4', effectIntensity: 'low', showParticles: false, showPulseRings: false, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('PlaylistVideo', () => {
  it('renders sequenced audio tags for preview playback', () => {
    render(<PlaylistVideo project={project} />);

    const audio = screen.getAllByTestId('preview-audio');
    expect(audio).toHaveLength(2);
    expect(audio[0].getAttribute('src')).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/audio?v=01.mp3');
    expect(audio[0].parentElement?.getAttribute('data-sequence-from')).toBe('0');
    expect(audio[0].parentElement?.getAttribute('data-sequence-duration')).toBe('60');
    expect(audio[1].getAttribute('src')).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-2/audio?v=02.mp3');
    expect(audio[1].parentElement?.getAttribute('data-sequence-from')).toBe('60');
    expect(audio[1].parentElement?.getAttribute('data-sequence-duration')).toBe('90');
  });

  it('uses browser-safe preview cover URLs before falling back to static render assets', () => {
    render(<PlaylistVideo project={project} />);

    expect(document.querySelector('.p2v-cover')?.getAttribute('src')).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg');
  });
});
