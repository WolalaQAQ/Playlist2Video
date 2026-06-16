// @vitest-environment jsdom
import React from 'react';
import {render} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import type {PlaylistVideoProps} from './PlaylistVideo';
import {RemotionRoot} from './Root';

const remotionMock = vi.hoisted(() => ({
  compositionProps: null as null | {calculateMetadata: (input: {props: PlaylistVideoProps}) => unknown; schema?: unknown},
}));

vi.mock('remotion', async () => {
  const ReactActual = await vi.importActual<typeof React>('react');
  return {
    Composition: (props: {calculateMetadata: (input: {props: PlaylistVideoProps}) => unknown; schema?: unknown}) => {
      remotionMock.compositionProps = props;
      return ReactActual.createElement('div', {'data-testid': 'composition'});
    },
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
      coverPath: null,
      renderCoverPath: null,
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
      order: 1,
    },
  ],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {
    width: 1280,
    height: 720,
    fps: 24,
    videoCodec: 'h264',
    videoBitrateKbps: 12000,
    spectrumFps: 30,
    renderQuality: 'high',
    outputFileName: 'playlist-video.mp4',
    audioCodec: 'aac',
    audioBitrateKbps: 320,
    audioSampleRate: 48000,
    audioChannels: 2,
    audioVolumePercent: 100,
  },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

describe('RemotionRoot metadata', () => {
  it('uses project export FPS for composition metadata and duration', async () => {
    render(<RemotionRoot />);

    const metadata = await Promise.resolve(remotionMock.compositionProps?.calculateMetadata({props: {project}}));

    expect(metadata).toMatchObject({
      fps: 24,
      durationInFrames: 120,
      width: 1280,
      height: 720,
    });
  });

  it('passes a Zod schema to validate Remotion composition props', () => {
    render(<RemotionRoot />);

    expect(remotionMock.compositionProps?.schema).toBeTruthy();
  });
});

