// @vitest-environment jsdom
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {translations} from '../i18n';
import {ThemePanel} from './ThemePanel';

const project: Project = {
  id: 'project-1',
  name: 'Controls',
  sourceFolder: 'C:/Music',
  tracks: [],
  theme: {themeId: 'playlist-v4', effectIntensity: 'high', showParticles: true, showPulseRings: true, playlistPanelMode: 'full'},
  exportConfig: {
    width: 1920,
    height: 1080,
    fps: 30,
    videoCodec: 'h264',
    videoBitrateKbps: 12000,
    spectrumFps: 10,
    renderQuality: 'fast',
    frameImageFormat: 'jpeg',
    jpegQuality: 100,
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

it('shows the current theme and export settings', () => {
  render(<ThemePanel copy={translations.en.theme} project={project} onUpdateSettings={vi.fn()} />);

  expect(screen.getByText('Playlist V4')).toBeInTheDocument();
  expect(screen.getByLabelText('Effect intensity')).toHaveValue('high');
  expect(screen.getByLabelText('Show particles')).toBeChecked();
  expect(screen.getByLabelText('Show pulse rings')).toBeChecked();
  expect(screen.getByLabelText('Width')).toHaveValue(1920);
  expect(screen.getByLabelText('Height')).toHaveValue(1080);
  expect(screen.getByLabelText('FPS')).toHaveValue(30);
  expect(screen.getByLabelText('Spectrum FPS')).toHaveValue(10);
  expect(screen.getByLabelText('Render quality')).toHaveValue('fast');
  expect(screen.getByLabelText('Intermediate frame format')).toHaveValue('jpeg');
  expect(screen.getByLabelText('JPEG frame quality')).toHaveValue(100);
  expect(screen.getByLabelText('Video bitrate')).toHaveValue(12000);
  expect(screen.getByLabelText('Output file name')).toHaveValue('playlist-video.mp4');
  expect(screen.getByLabelText('Audio codec')).toHaveValue('aac');
  expect(screen.getByLabelText('Audio bitrate')).toHaveValue('320');
  expect(screen.getByLabelText('Sample rate')).toHaveValue('48000');
  expect(screen.getByLabelText('Channels')).toHaveValue('2');
  expect(screen.getByLabelText('Volume')).toHaveValue(100);
});

it('saves visual effect settings from the panel controls', async () => {
  const user = userEvent.setup();
  const onUpdateSettings = vi.fn().mockResolvedValue(project);
  render(<ThemePanel copy={translations.en.theme} project={project} onUpdateSettings={onUpdateSettings} />);

  await user.selectOptions(screen.getByLabelText('Effect intensity'), 'medium');
  await user.click(screen.getByLabelText('Show particles'));
  await user.click(screen.getByLabelText('Show pulse rings'));

  expect(onUpdateSettings).toHaveBeenNthCalledWith(1, {theme: {effectIntensity: 'medium'}});
  expect(onUpdateSettings).toHaveBeenNthCalledWith(2, {theme: {showParticles: false}});
  expect(onUpdateSettings).toHaveBeenNthCalledWith(3, {theme: {showPulseRings: false}});
});

it('saves export settings from the panel controls', async () => {
  const user = userEvent.setup();
  const onUpdateSettings = vi.fn().mockResolvedValue(project);
  render(<ThemePanel copy={translations.en.theme} project={project} onUpdateSettings={onUpdateSettings} />);

  await user.clear(screen.getByLabelText('Width'));
  await user.type(screen.getByLabelText('Width'), '1280');
  await user.tab();
  await user.clear(screen.getByLabelText('Height'));
  await user.type(screen.getByLabelText('Height'), '720');
  await user.tab();
  await user.clear(screen.getByLabelText('FPS'));
  await user.type(screen.getByLabelText('FPS'), '24');
  await user.tab();
  await user.clear(screen.getByLabelText('Spectrum FPS'));
  await user.type(screen.getByLabelText('Spectrum FPS'), '8');
  await user.tab();
  await user.selectOptions(screen.getByLabelText('Render quality'), 'minimal');
  await user.selectOptions(screen.getByLabelText('Intermediate frame format'), 'png');
  await user.clear(screen.getByLabelText('JPEG frame quality'));
  await user.type(screen.getByLabelText('JPEG frame quality'), '95');
  await user.tab();
  await user.clear(screen.getByLabelText('Video bitrate'));
  await user.type(screen.getByLabelText('Video bitrate'), '8000');
  await user.tab();
  await user.clear(screen.getByLabelText('Output file name'));
  await user.type(screen.getByLabelText('Output file name'), 'custom-playlist.mp4');
  await user.tab();

  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {width: 1280}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {height: 720}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {fps: 24}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {spectrumFps: 8}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {renderQuality: 'minimal'}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {frameImageFormat: 'png'}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {jpegQuality: 95}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {videoBitrateKbps: 8000}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {outputFileName: 'custom-playlist.mp4'}});
});

it('saves FFmpeg audio export settings from the panel controls', async () => {
  const user = userEvent.setup();
  const onUpdateSettings = vi.fn().mockResolvedValue(project);
  render(<ThemePanel copy={translations.en.theme} project={project} onUpdateSettings={onUpdateSettings} />);

  await user.selectOptions(screen.getByLabelText('Audio bitrate'), '256');
  await user.selectOptions(screen.getByLabelText('Sample rate'), '44100');
  await user.selectOptions(screen.getByLabelText('Channels'), '1');
  await user.clear(screen.getByLabelText('Volume'));
  await user.type(screen.getByLabelText('Volume'), '85');
  await user.tab();

  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {audioBitrateKbps: 256}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {audioSampleRate: 44100}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {audioChannels: 1}});
  expect(onUpdateSettings).toHaveBeenCalledWith({exportConfig: {audioVolumePercent: 85}});
});

it('disables controls until a project is loaded', () => {
  render(<ThemePanel copy={translations.en.theme} project={null} onUpdateSettings={vi.fn()} />);

  expect(screen.getByLabelText('Effect intensity')).toBeDisabled();
  expect(screen.getByLabelText('Width')).toBeDisabled();
  expect(screen.getByLabelText('Audio bitrate')).toHaveValue('320');
  expect(screen.getByLabelText('Intermediate frame format')).toHaveValue('jpeg');
  expect(screen.getByLabelText('JPEG frame quality')).toHaveValue(100);
  expect(screen.getByText('Scan a folder to enable parameter controls.')).toBeInTheDocument();
});

it('disables JPEG quality input while PNG intermediate frames are selected', () => {
  render(
    <ThemePanel
      copy={translations.en.theme}
      project={{...project, exportConfig: {...project.exportConfig, frameImageFormat: 'png'}}}
      onUpdateSettings={vi.fn()}
    />,
  );

  expect(screen.getByLabelText('Intermediate frame format')).toHaveValue('png');
  expect(screen.getByLabelText('JPEG frame quality')).toBeDisabled();
});

