// @vitest-environment jsdom
import React from 'react';
import {fireEvent, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Project, Track} from '@playlist2video/shared';
import {App} from './App';
import * as client from './api/client';

vi.mock('@remotion/player', () => ({
  Player: ({inputProps}: {inputProps: {project: Project}}) => (
    <div data-testid="remotion-player">{inputProps.project.tracks.sort((a, b) => a.order - b.order).map((track) => track.title).join(' > ')}</div>
  ),
}));

vi.mock('@playlist2video/video-template', () => ({PlaylistVideo: () => null}));

vi.mock('./api/client', () => ({
  scanFolder: vi.fn(),
  getCurrentProject: vi.fn(),
  reorderTracks: vi.fn(),
  updateTrackMetadata: vi.fn(),
  exportCurrentProject: vi.fn(),
}));

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
    coverPreviewUrl: null,
    order,
  };
}

function projectWithTracks(tracks: Track[]): Project {
  return {
    id: 'project-1',
    name: 'Preview',
    sourceFolder: 'C:/Music',
    tracks,
    theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
    exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

function createDataTransfer() {
  const data = new Map<string, string>();
  return {
    effectAllowed: 'move',
    dropEffect: 'move',
    setData: vi.fn((type: string, value: string) => data.set(type, value)),
    getData: vi.fn((type: string) => data.get(type) ?? ''),
  };
}

const scannedProject = projectWithTracks([track('track-1', 'Alpha', 0), track('track-2', 'Beta', 1)]);
const reorderedProject = projectWithTracks([track('track-1', 'Alpha', 1), track('track-2', 'Beta', 0)]);

describe('App preview generation', () => {
  beforeEach(() => {
    vi.mocked(client.scanFolder).mockResolvedValue({project: scannedProject, warnings: []});
    vi.mocked(client.reorderTracks).mockResolvedValue(reorderedProject);
    vi.mocked(client.updateTrackMetadata).mockImplementation(async ({trackId, title, artist}) => ({
      ...scannedProject,
      tracks: scannedProject.tracks.map((track) => (track.id === trackId ? {...track, title, artist} : track)),
    }));
    vi.mocked(client.exportCurrentProject).mockResolvedValue({outputPath: 'C:/out/playlist-video.mp4'});
  });

  it('does not render a video preview after scan until Generate video is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole('textbox'), 'C:\\Music');
    await user.click(screen.getByRole('button', {name: 'Scan folder'}));

    expect(await screen.findByDisplayValue('Alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('remotion-player')).not.toBeInTheDocument();
    expect(client.exportCurrentProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: 'Generate video'}));

    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');
    expect(client.exportCurrentProject).not.toHaveBeenCalled();
  });

  it('keeps the generated preview unchanged while tracks are reordered, then refreshes it on Generate video', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByRole('textbox'), 'C:\\Music');
    await user.click(screen.getByRole('button', {name: 'Scan folder'}));
    await screen.findByDisplayValue('Alpha');
    await user.click(screen.getByRole('button', {name: 'Generate video'}));
    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', {name: 'Drag Beta'}), {dataTransfer});
    fireEvent.dragOver(screen.getByLabelText('Track 1: Alpha'), {dataTransfer});
    fireEvent.drop(screen.getByLabelText('Track 1: Alpha'), {dataTransfer});

    expect(client.reorderTracks).toHaveBeenCalledWith(['track-2', 'track-1']);
    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');

    await user.click(screen.getByRole('button', {name: 'Generate video'}));

    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Beta > Alpha');
  });
});



