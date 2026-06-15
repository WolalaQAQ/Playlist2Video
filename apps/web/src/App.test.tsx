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
  updateProjectSettings: vi.fn(),
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
    exportConfig: {
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: 'h264',
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
    window.localStorage.clear();
    document.documentElement.lang = '';
    vi.mocked(client.scanFolder).mockResolvedValue({project: scannedProject, warnings: []});
    vi.mocked(client.reorderTracks).mockResolvedValue(reorderedProject);
    vi.mocked(client.updateTrackMetadata).mockImplementation(async ({trackId, title, artist}) => ({
      ...scannedProject,
      tracks: scannedProject.tracks.map((track) => (track.id === trackId ? {...track, title, artist} : track)),
    }));
    vi.mocked(client.updateProjectSettings).mockImplementation(async (settings) => ({
      ...scannedProject,
      theme: {...scannedProject.theme, ...settings.theme},
      exportConfig: {...scannedProject.exportConfig, ...settings.exportConfig},
    }));
    vi.mocked(client.exportCurrentProject).mockResolvedValue({outputPath: 'C:/out/playlist-video.mp4'});
  });

  it('renders Chinese by default and switches the Web UI to English', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', {name: '把本地音乐文件夹转换为歌单视频。'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '扫描文件夹'})).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('zh-CN');

    await user.click(screen.getByRole('button', {name: 'English'}));

    expect(screen.getByRole('heading', {name: 'Turn a local music folder into a playlist video.'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Scan folder'})).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('en');

    await user.click(screen.getByRole('button', {name: '中文'}));

    expect(screen.getByRole('heading', {name: '把本地音乐文件夹转换为歌单视频。'})).toBeInTheDocument();
    expect(document.documentElement.lang).toBe('zh-CN');
  });

  it('does not render a video preview after scan until Generate video is clicked', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText('C:\\Users\\You\\Music\\Playlist'), 'C:\\Music');
    await user.click(screen.getByRole('button', {name: '扫描文件夹'}));

    expect(await screen.findByDisplayValue('Alpha')).toBeInTheDocument();
    expect(screen.queryByTestId('remotion-player')).not.toBeInTheDocument();
    expect(client.exportCurrentProject).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', {name: '生成视频'}));

    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');
    expect(client.exportCurrentProject).not.toHaveBeenCalled();
  });

  it('does not show a hard-coded default export description', () => {
    render(<App />);

    expect(screen.getByRole('heading', {name: '导出'})).toBeInTheDocument();
    expect(screen.queryByText('默认输出：1920x1080、30fps、MP4。')).not.toBeInTheDocument();
    expect(screen.queryByText('Default output: 1920x1080, 30fps, MP4.')).not.toBeInTheDocument();
  });

  it('keeps the generated preview unchanged while tracks are reordered, then refreshes it on Generate video', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText('C:\\Users\\You\\Music\\Playlist'), 'C:\\Music');
    await user.click(screen.getByRole('button', {name: '扫描文件夹'}));
    await screen.findByDisplayValue('Alpha');
    await user.click(screen.getByRole('button', {name: '生成视频'}));
    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(screen.getByRole('button', {name: '拖动 Beta'}), {dataTransfer});
    fireEvent.dragOver(screen.getByLabelText('第 1 首：Alpha'), {dataTransfer});
    fireEvent.drop(screen.getByLabelText('第 1 首：Alpha'), {dataTransfer});

    expect(client.reorderTracks).toHaveBeenCalledWith(['track-2', 'track-1']);
    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');

    await user.click(screen.getByRole('button', {name: '生成视频'}));

    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Beta > Alpha');
  });

  it('saves parameter changes without auto-refreshing the generated preview', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText('C:\\Users\\You\\Music\\Playlist'), 'C:\\Music');
    await user.click(screen.getByRole('button', {name: '扫描文件夹'}));
    await screen.findByDisplayValue('Alpha');
    await user.click(screen.getByRole('button', {name: '生成视频'}));

    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');

    await user.selectOptions(screen.getByLabelText('效果强度'), 'medium');

    expect(client.updateProjectSettings).toHaveBeenCalledWith({theme: {effectIntensity: 'medium'}});
    expect(screen.getByTestId('remotion-player')).toHaveTextContent('Alpha > Beta');
  });
});





