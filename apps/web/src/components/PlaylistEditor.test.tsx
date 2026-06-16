// @vitest-environment jsdom
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import type {Project, Track} from '@playlist2video/shared';
import {translations} from '../i18n';
import {PlaylistEditor} from './PlaylistEditor';

function track(id: string, title: string, order: number): Track {
  return {
    id,
    sourcePath: `C:/Music/${title}.mp3`,
    title,
    artist: `${title} Artist`,
    album: null,
    durationSeconds: 61,
    coverPath: null,
    renderCoverPath: null,
    audioPreviewUrl: null,
    coverPreviewUrl: id === 'track-1' ? 'http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg' : null,
    order,
  };
}

const project: Project = {
  id: 'project-1',
  name: 'Preview',
  sourceFolder: 'C:/Music',
  tracks: [track('track-1', 'Alpha', 0), track('track-2', 'Beta', 1), track('track-3', 'Gamma', 2)],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', videoBitrateKbps: 12000, spectrumFps: 30, renderQuality: 'high', frameImageFormat: 'jpeg', jpegQuality: 100, outputFileName: 'playlist-video.mp4', audioCodec: 'aac', audioBitrateKbps: 320, audioSampleRate: 48000, audioChannels: 2, audioVolumePercent: 100},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function createDataTransfer() {
  const data = new Map<string, string>();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: vi.fn((type: string, value: string) => data.set(type, value)),
    getData: vi.fn((type: string) => data.get(type) ?? ''),
  };
}

describe('PlaylistEditor', () => {
  it('uses browser-safe cover preview URLs instead of file URLs', () => {
    render(<PlaylistEditor copy={translations.en.playlist} project={project} onReorder={vi.fn()} onUpdateTrack={vi.fn()} />);

    expect(screen.getByRole('presentation').getAttribute('src')).toBe('http://127.0.0.1:4317/api/v1/projects/current/media/track-1/cover?v=cover.jpg');
  });

  it('reorders tracks by native drag events', () => {
    const onReorder = vi.fn();
    render(<PlaylistEditor copy={translations.en.playlist} project={project} onReorder={onReorder} onUpdateTrack={vi.fn()} />);
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(screen.getByRole('button', {name: 'Drag Gamma'}), {dataTransfer});
    fireEvent.dragOver(screen.getByLabelText('Track 1: Alpha'), {dataTransfer});
    fireEvent.drop(screen.getByLabelText('Track 1: Alpha'), {dataTransfer});

    expect(onReorder).toHaveBeenCalledWith(['track-3', 'track-1', 'track-2']);
    expect(screen.getAllByLabelText('Track title').map((input) => (input as HTMLInputElement).value)).toEqual(['Gamma', 'Alpha', 'Beta']);
  });
  it('reorders tracks with a mouse drag over another row', () => {
    const onReorder = vi.fn();
    render(<PlaylistEditor copy={translations.en.playlist} project={project} onReorder={onReorder} onUpdateTrack={vi.fn()} />);
    const targetRow = screen.getByLabelText('Track 1: Alpha');
    const originalElementsFromPoint = document.elementsFromPoint;
    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: vi.fn(() => [targetRow]),
    });

    fireEvent.mouseDown(screen.getByRole('button', {name: 'Drag Gamma'}), {button: 0, clientX: 10, clientY: 10});
    fireEvent.mouseMove(document, {clientX: 20, clientY: 20});
    fireEvent.mouseUp(document, {clientX: 20, clientY: 20});

    expect(onReorder).toHaveBeenCalledWith(['track-3', 'track-1', 'track-2']);
    expect(screen.getAllByLabelText('Track title').map((input) => (input as HTMLInputElement).value)).toEqual(['Gamma', 'Alpha', 'Beta']);

    Object.defineProperty(document, 'elementsFromPoint', {
      configurable: true,
      value: originalElementsFromPoint,
    });
  });
});



