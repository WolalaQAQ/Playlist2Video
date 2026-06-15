// @vitest-environment jsdom
/// <reference types="node" />
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {render, screen} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import type {Project} from '@playlist2video/shared';
import {PlaylistVideo} from './PlaylistVideo';

const remotionState = vi.hoisted(() => ({currentFrame: 0}));
const themeCssPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'themes', 'playlist-v4', 'theme.css');

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
    useCurrentFrame: () => remotionState.currentFrame,
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
      waveformPeaks: [0.1, 0.8, 0.4, 0.2, 0.9, 0.3, 0.7, 0.15, 0.55, 1],
      spectrumFrames: [
        [1, 0.85, 0.5, 0.24, 0.1, 0.04, 0.02, 0.01],
        [0.02, 0.04, 0.1, 0.24, 0.5, 0.7, 0.9, 1],
      ],
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
      waveformPeaks: [0.2, 0.6, 1],
      spectrumFrames: [[0.2, 0.6, 1]],
      order: 1,
    },
  ],
  theme: {themeId: 'playlist-v4', effectIntensity: 'low', showParticles: false, showPulseRings: false, playlistPanelMode: 'full'},
  exportConfig: {width: 1920, height: 1080, fps: 30, videoCodec: 'h264', outputFileName: 'playlist-video.mp4'},
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

function projectWithEffects(spectrumFrames: number[][]): Project {
  return {
    ...project,
    tracks: [
      {
        ...project.tracks[0],
        spectrumFrames,
      },
    ],
    theme: {
      ...project.theme,
      effectIntensity: 'high',
      showParticles: true,
      showPulseRings: true,
    },
  };
}

function readEnergyVariables() {
  const root = document.querySelector<HTMLElement>('.p2v-root');
  expect(root).not.toBeNull();

  return {
    low: Number.parseFloat(root!.style.getPropertyValue('--low-energy')),
    mid: Number.parseFloat(root!.style.getPropertyValue('--mid-energy')),
    high: Number.parseFloat(root!.style.getPropertyValue('--high-energy')),
    overall: Number.parseFloat(root!.style.getPropertyValue('--effect-energy')),
  };
}

function cssRule(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

describe('PlaylistVideo', () => {
  beforeEach(() => {
    remotionState.currentFrame = 0;
  });

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

  it('renders spectrum bars from track frequency data', () => {
    render(<PlaylistVideo project={project} />);

    const bars = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar'));
    expect(bars).toHaveLength(96);
    expect(bars.some((bar) => Number.parseFloat(bar.style.height) > 50)).toBe(true);
  });

  it('updates spectrum bars as playback advances through the current track', () => {
    remotionState.currentFrame = 0;
    const {rerender} = render(<PlaylistVideo project={project} />);
    const initialHeights = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar')).map((bar) => bar.style.height);

    remotionState.currentFrame = 45;
    rerender(<PlaylistVideo project={project} />);
    const laterHeights = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar')).map((bar) => bar.style.height);

    expect(laterHeights).not.toEqual(initialHeights);
  });

  it('renders the frequency spectrum as a live visualizer instead of a split progress meter', () => {
    remotionState.currentFrame = 45;
    render(<PlaylistVideo project={project} />);

    const bars = Array.from(document.querySelectorAll<HTMLElement>('.p2v-spectrum-bar'));
    expect(bars.every((bar) => bar.classList.contains('is-spectrum'))).toBe(true);
    expect(bars.some((bar) => bar.classList.contains('is-played'))).toBe(false);
    expect(bars.some((bar) => bar.classList.contains('is-playhead'))).toBe(false);
  });

  it('drives theme effect energy from the current spectrum frame instead of a synthetic pulse', () => {
    const effectProject = projectWithEffects([
      [1, 0.95, 0.85, 0.18, 0.1, 0.04, 0.02, 0.01],
      [0.02, 0.03, 0.06, 0.18, 0.3, 0.65, 0.9, 1],
    ]);

    const {rerender} = render(<PlaylistVideo project={effectProject} />);
    const initialEnergy = readEnergyVariables();
    const lowRingTransform = document.querySelector<HTMLElement>('.p2v-ring-one')?.style.transform ?? '';

    expect(initialEnergy.low).toBeGreaterThan(initialEnergy.high);
    expect(initialEnergy.overall).toBeGreaterThan(0);
    expect(lowRingTransform).toMatch(/scale\(/);

    remotionState.currentFrame = 45;
    rerender(<PlaylistVideo project={effectProject} />);
    const laterEnergy = readEnergyVariables();

    expect(laterEnergy.high).toBeGreaterThan(laterEnergy.low);
  });

  it('renders high-frequency particle sparks whose strength follows spectrum energy', () => {
    render(
      <PlaylistVideo
        project={projectWithEffects([
          [0.02, 0.03, 0.05, 0.1, 0.2, 0.74, 0.92, 1],
        ])}
      />,
    );

    const energy = readEnergyVariables();
    const particles = Array.from(document.querySelectorAll<HTMLElement>('.p2v-particle'));

    expect(energy.high).toBeGreaterThan(energy.low);
    expect(particles).toHaveLength(18);
    expect(particles.some((particle) => Number.parseFloat(particle.style.opacity) > 0.6)).toBe(true);
  });

  it('formats the now playing position with two-digit current and total counts', () => {
    const fourTrackProject: Project = {
      ...project,
      tracks: [
        ...project.tracks,
        {...project.tracks[0], id: 'track-3', title: 'Third', sourcePath: 'C:/Music/03.mp3', order: 2},
        {...project.tracks[1], id: 'track-4', title: 'Fourth', sourcePath: 'C:/Music/04.mp3', order: 3},
      ],
    };

    render(<PlaylistVideo project={fourTrackProject} />);

    expect(screen.queryByText('NOW PLAYING · 01/04')).not.toBeNull();
  });

  it('applies adaptive sizing without replacing long current track titles with ellipses', () => {
    const longTitleProject: Project = {
      ...project,
      tracks: [
        {
          ...project.tracks[0],
          title: 'This Is a Very Long Song Title That Should Not Dominate the Whole Video Canvas',
        },
      ],
    };

    render(<PlaylistVideo project={longTitleProject} />);

    const title = screen.getByRole('heading', {level: 1});
    expect(Number.parseFloat(title.style.fontSize)).toBeLessThan(92);

    const css = readFileSync(themeCssPath, 'utf8');
    expect(css).toMatch(/\.p2v-copy h1\{[^}]*overflow:visible/);
    expect(css).not.toMatch(/\.p2v-copy h1\{[^}]*max-height/);
    expect(css).not.toMatch(/\.p2v-copy h1\{[^}]*-webkit-line-clamp/);
    expect(css).not.toMatch(/\.p2v-copy h1\{[^}]*text-overflow:ellipsis/);
  });

  it('lets over-four-line titles reserve natural layout space instead of overlapping the artist', () => {
    const css = readFileSync(themeCssPath, 'utf8');

    expect(css).toMatch(/\.p2v-copy h1\{[^}]*overflow:visible/);
    expect(css).not.toMatch(/\.p2v-copy h1\{[^}]*max-height/);
    expect(css).not.toMatch(/\.p2v-copy h1\{[^}]*position:absolute/);
    expect(css).toMatch(/\.p2v-copy p\{[^}]*margin:22px 0 0/);
  });

  it('centers the whole layout group in the canvas while keeping internal text alignment left', () => {
    const css = readFileSync(themeCssPath, 'utf8');

    expect(css).toMatch(/\.p2v-layout\{[^}]*left:50%/);
    expect(css).toMatch(/\.p2v-layout\{[^}]*transform:translateX\(-50%\)/);
    expect(css).toMatch(/\.p2v-layout\{[^}]*width:min\(calc\(100% - 9\.6%\),1680px\)/);
    expect(css).toMatch(/\.p2v-layout\{[^}]*display:flex/);
    expect(css).toMatch(/\.p2v-layout\{[^}]*justify-content:center/);
    expect(css).toMatch(/\.p2v-copy\{[^}]*text-align:left/);
    expect(css).toMatch(/\.p2v-playlist-panel\{[^}]*flex:0 0 520px/);
    expect(css).not.toMatch(/\.p2v-layout\{[^}]*grid-template-columns/);
  });

  it('keeps now-playing metadata and progress above beat effect overlays', () => {
    const css = readFileSync(themeCssPath, 'utf8');

    expect(cssRule(css, '.p2v-bg')).toMatch(/z-index:0/);
    expect(cssRule(css, '.p2v-ring,.p2v-strobe,.p2v-flash,.p2v-particles')).toMatch(/z-index:1/);
    expect(cssRule(css, '.p2v-layout')).toMatch(/z-index:3/);
    expect(cssRule(css, '.p2v-now,.p2v-copy,.p2v-progress,.p2v-cover')).toMatch(/position:relative/);
    expect(cssRule(css, '.p2v-now,.p2v-copy,.p2v-progress,.p2v-cover')).toMatch(/z-index:3/);
    expect(cssRule(css, '.p2v-spectrum')).toMatch(/z-index:4/);
  });
});
